// src/auction/auction.service.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// Allow 'any' for parsing numbers

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PocketBaseService } from 'src/pocketbase/pocketbase.service';
import { Interval } from '@nestjs/schedule';
import { RealtimeLotRecord, AuctionStateRecord } from './types'; // Import updated types
import { DirectusService } from 'src/directus/directus.service'; // Assuming you create this service

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  // Define constants for timer and increment logic
  private readonly BASE_TIMER_DURATION = 30 * 1000; // 30 seconds in milliseconds
  private readonly FINAL_COUNTDOWN_THRESHOLD = 10 * 1000; // 10 seconds in milliseconds
  private readonly INACTIVITY_THRESHOLD = 10 * 1000; // 10 seconds for increment reduction periods
  private readonly MAX_INACTIVITY_PERIODS = 3; // Maximum number of increment reductions

  // Inject PocketBaseService and the new DirectusService
  constructor(
    private pocketBaseService: PocketBaseService,
    private directusService: DirectusService, // Inject the DirectusService
  ) {}

  // --- Scheduled Task to Activate Auctions ---
  // Runs periodically to find and activate upcoming auction states.
  // Also responsible for linking the PocketBase auction_state ID back to Directus
  // and setting the initial Directus current_lot_id.
  @Interval(60000) // Check every 60 seconds
  async handleAuctionActivation() {
    // this.logger.log("[Auction Activation] Checking for auctions to activate..."); // Keep logging less frequent
    try {
      const pb = this.pocketBaseService.adminClient;
      const now = new Date();

      // Find 'upcoming' auction_state records whose start time is in the past or now
      const auctionsToActivate = await pb
        .collection('auction_state')
        .getList<AuctionStateRecord>(1, 50, {
          // Adjust limit as needed
          filter: `status = "upcoming" && start_time <= "${now.toISOString()}"`,
        });

      if (auctionsToActivate.items.length > 0) {
        this.logger.log(
          `[Auction Activation] Found ${auctionsToActivate.items.length} auction state record(s) to activate.`,
        );
      }

      // Activate each found auction state
      for (const auctionState of auctionsToActivate.items) {
        try {
          this.logger.log(
            `[Auction Activation] Processing activation for auction state record: ${auctionState.id} (Directus Auction ID: ${auctionState.directus_auction_id})`,
          );

          // Find the first lot for this auction based on created date
          const firstLot = await pb
            .collection('lots_realtime')
            .getFirstListItem<RealtimeLotRecord>(
              `auction = "${auctionState.directus_auction_id}" && Concluded = false`, // Filter by Directus Auction ID and not concluded
              { sort: 'created' }, // Sort by created date to get the oldest lot
            );

          if (firstLot) {
            const timerEndTime = new Date(
              now.getTime() + this.BASE_TIMER_DURATION,
            ).toISOString();

            // Update the auction_state record to 'active' and set the current_lot and initial timer state
            await pb.collection('auction_state').update(auctionState.id, {
              status: 'active',
              current_lot: firstLot.id, // Set the first lot's PocketBase ID
              current_lot_end_time: timerEndTime, // Set the initial timer end time
              inactivity_periods: 0, // Initialize inactivity periods for the new lot
              last_increment_reduction_time: now.toISOString(), // Initialize last reduction time
            });

            this.logger.log(
              `[Auction Activation] Auction state ${auctionState.id} set to active, current_lot set to PB ID ${firstLot.id}, timer ends at ${timerEndTime}.`,
            );

            // --- IMPORTANT: Update the corresponding Directus Auction record ---
            // Save the PocketBase auction_state ID and the *Directus* current_lot_id back to Directus
            try {
              // Use the injected directusService to update the item
              await this.directusService.updateItem(
                'auctions',
                auctionState.directus_auction_id,
                {
                  pb_auction_state_id: auctionState.id, // Save the PocketBase auction_state ID to the new field
                  current_lot_id: firstLot.directus_id, // *** Use the Directus Lot ID from the PocketBase record ***
                  status: 'active', // Also sync status to Directus
                },
              );
              this.logger.log(
                `[Auction Activation] Updated Directus auction ${auctionState.directus_auction_id} with pb_auction_state_id: ${auctionState.id} and Directus current_lot_id: ${firstLot.directus_id}`,
              );
            } catch (directusUpdateError: any) {
              this.logger.error(
                `[Auction Activation] Error updating Directus auction ${auctionState.directus_auction_id} with PB/Directus IDs:`,
                directusUpdateError.message || directusUpdateError,
              );
              // Decide how to handle this error - it means the link wasn't saved.
              // The frontend won't be able to find the pb_auction_state_id for this auction on refresh.
            }
            // --- End of Directus Update ---
          } else {
            this.logger.warn(
              `[Auction Activation] No unconcluded lots found for Directus Auction ID: ${auctionState.directus_auction_id}. Cannot activate auction state.`,
            );
            // Mark as error if no lots are found
            await pb.collection('auction_state').update(auctionState.id, {
              status: 'error',
              current_lot: null,
              current_lot_end_time: null,
              inactivity_periods: 0,
              last_increment_reduction_time: null,
            });
            // Optional: Update Directus auction status to error/no_lots using the injected service
            try {
              await this.directusService.updateItem(
                'auctions',
                auctionState.directus_auction_id,
                {
                  status: 'error', // Assuming 'status' field exists in Directus auctions
                  current_lot_id: null, // Ensure current_lot_id is null in Directus
                },
              );
              this.logger.log(
                `[Auction Activation] Updated Directus auction ${auctionState.directus_auction_id} status to error.`,
              );
            } catch (directusUpdateError: any) {
              this.logger.error(
                `[Auction Activation] Error updating Directus auction ${auctionState.directus_auction_id} status to error:`,
                directusUpdateError.message || directusUpdateError,
              );
            }
          }
        } catch (activateError: any) {
          this.logger.error(
            `[Auction Activation] Error processing activation for auction state ${auctionState.id}:`,
            activateError.message || activateError,
          );
          // Optionally update the auction_state status to error if processing fails
          try {
            await pb.collection('auction_state').update(auctionState.id, {
              status: 'error',
            });
            this.logger.log(
              `[Auction Activation] Marked auction state ${auctionState.id} as error due to processing failure.`,
            );
          } catch (updateError: any) {
            this.logger.error(
              `[Auction Activation] Failed to mark auction state ${auctionState.id} as error:`,
              updateError.message || updateError,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(
        '[Auction Activation] Error in activation scheduled task:',
        error.message || error,
      );
    }
  }

  // --- Core Timer Processing Logic (Scheduled) ---
  // Runs every second to process timers for active lots.
  @Interval(1000) // Run every 1000 milliseconds (1 second)
  async handleAuctionTimers() {
    try {
      const pb = this.pocketBaseService.adminClient;

      // Find all 'active' auction_state records
      const activeAuctionStates = await pb
        .collection('auction_state')
        .getList<AuctionStateRecord>(1, 50, {
          // Adjust limit as needed
          filter: 'status = "active"',
          expand: 'current_lot', // Expand the current_lot relation to get its data
        });

      // Process active auction states
      for (const auctionState of activeAuctionStates.items) {
        // Access the expanded current_lot data
        const currentLot = auctionState.expand?.current_lot;

        if (!currentLot) {
          // No current lot set or expanded - check if auction should be concluded
          this.logger.warn(
            `[Backend Timer] Active auction state ${auctionState.id} has no current_lot set or expanded. Checking if auction should be concluded.`,
          );
          await this.checkAndConcludeAuctionIfNeeded(auctionState);
          continue;
        }

        // Skip if the lot is already concluded (should be handled by advancement, but safety check)
        if (currentLot.Concluded === true) {
          this.logger.log(
            `[Backend Timer] Lot ${currentLot.id} is already concluded but still set as current lot in auction state ${auctionState.id}. Advancing to next lot.`,
          );
          await this.advanceAuctionToNextLot(auctionState);
          continue;
        }

        // Process the lot timer
        await this.processLotTimer(currentLot, auctionState);
      }
    } catch (error: any) {
      this.logger.error(
        '[Persistent Timer] Error in persistent timer loop:',
        error.message || error,
      );
    }
  }

  // Check if auction should be concluded and conclude it if needed
  private async checkAndConcludeAuctionIfNeeded(
    auctionState: AuctionStateRecord,
  ) {
    this.logger.log(
      `[Backend Timer] Checking if auction state ${auctionState.id} (Directus ID: ${auctionState.directus_auction_id}) should be concluded.`,
    );
    try {
      const pb = this.pocketBaseService.adminClient;

      // Check if there are any unconcluded lots left for this Directus Auction ID
      const unconcludedLotsCount = await pb
        .collection('lots_realtime')
        .getList(1, 1, {
          filter: `auction = "${auctionState.directus_auction_id}" && Concluded = false`,
        });

      // If no unconcluded lots remain, conclude the auction state
      if (unconcludedLotsCount.items.length === 0) {
        this.logger.log(
          `[Backend Timer] No unconcluded lots found for Directus Auction ID ${auctionState.directus_auction_id}. Concluding auction state.`,
        );

        await pb.collection('auction_state').update(auctionState.id, {
          status: 'completed',
          current_lot: null, // Clear the current lot relation
          current_lot_end_time: null,
          inactivity_periods: 0,
          last_increment_reduction_time: null,
        });

        this.logger.log(
          `[Backend Timer] Auction state ${auctionState.id} (Directus ID: ${auctionState.directus_auction_id}) marked as completed.`,
        );

        // Optional: Update the Directus auction record status as well using the injected service
        try {
          await this.directusService.updateItem(
            'auctions',
            auctionState.directus_auction_id,
            {
              status: 'completed', // Assuming 'status' field exists in Directus auctions
              current_lot_id: null, // Ensure current_lot_id is null in Directus
            },
          );
          this.logger.log(
            `[Backend Timer] Updated Directus auction ${auctionState.directus_auction_id} status to completed and cleared current_lot_id.`,
          );
        } catch (directusUpdateError: any) {
          this.logger.error(
            `[Backend Timer] Error updating Directus auction ${auctionState.directus_auction_id} status:`,
            directusUpdateError.message || directusUpdateError,
          );
        }
      } else {
        // If unconcluded lots exist but no current lot is set, fix this by advancing to the next lot
        this.logger.log(
          `[Backend Timer] Found unconcluded lots for auction ${auctionState.directus_auction_id} but no current lot set in auction_state. Attempting to advance.`,
        );
        await this.advanceAuctionToNextLot(auctionState);
      }
    } catch (error: any) {
      this.logger.error(
        `[Backend Timer] Error checking if auction state ${auctionState.id} should be concluded:`,
        error.message || error,
      );
    }
  }

  // Logic to process timer and increment reduction for a single lot
  private async processLotTimer(
    lot: RealtimeLotRecord,
    auctionState: AuctionStateRecord,
  ) {
    try {
      const pb = this.pocketBaseService.adminClient;
      const now = Date.now();

      // Re-fetch the latest auction state to get up-to-date timer end time and inactivity periods
      // This is important because the auctionState might have been updated by a bid or inactivity reduction
      const latestAuctionState = await pb
        .collection('auction_state')
        .getOne<AuctionStateRecord>(auctionState.id);

      // Safety check: ensure lot is still current and not concluded (redundant with main timer loop, but safe)
      if (latestAuctionState.current_lot !== lot.id || lot.Concluded === true) {
        this.logger.log(
          `[Backend Timer] Skipping timer processing for lot ${lot.id} - no longer current or already concluded.`,
        );
        return;
      }

      const timerEndTime = latestAuctionState.current_lot_end_time
        ? new Date(latestAuctionState.current_lot_end_time).getTime()
        : now; // Fallback if timer end time is missing

      const lastReductionTime = latestAuctionState.last_increment_reduction_time
        ? new Date(latestAuctionState.last_increment_reduction_time).getTime()
        : new Date(latestAuctionState.created).getTime(); // Fallback to auction state creation time

      const timeSinceLastReduction = now - lastReductionTime;
      const timeRemaining = Math.max(0, timerEndTime - now); // Calculate time remaining based on end time

      // --- Increment Reduction Logic based on Inactivity Periods ---
      // Only process inactivity if:
      // 1. Enough time has passed since the last reduction (at least INACTIVITY_THRESHOLD)
      // 2. We haven't reached the maximum inactivity periods
      // 3. The timer is NOT currently being extended by recent bids (implicitly handled by lastReductionTime reset on bid)
      // 4. The lot is not already concluded (handled by outer checks)

      // Check if a new inactivity period should start
      if (
        timeSinceLastReduction >= this.INACTIVITY_THRESHOLD &&
        latestAuctionState.inactivity_periods < this.MAX_INACTIVITY_PERIODS
      ) {
        const newInactivityPeriods = latestAuctionState.inactivity_periods + 1;

        this.logger.log(
          `[Backend Timer] Lot ${lot.id}: *** INCREMENTING INACTIVITY *** now: ${now}, lastReductionTime: ${lastReductionTime}, timeSinceLastReduction: ${timeSinceLastReduction}ms. Increasing inactivity_periods from ${latestAuctionState.inactivity_periods} to ${newInactivityPeriods}.`,
        );

        // Calculate the new timer end time. It should be at least FINAL_COUNTDOWN_THRESHOLD from now.
        // If the current end time is already further out than that, keep the current end time.
        const requiredMinEndTime = now + this.FINAL_COUNTDOWN_THRESHOLD;
        const newTimerEndTime = new Date(
          Math.max(timerEndTime, requiredMinEndTime),
        ).toISOString();

        // Update auction_state with new inactivity periods, reset last reduction time, and update timer end time
        await pb.collection('auction_state').update(latestAuctionState.id, {
          inactivity_periods: newInactivityPeriods,
          last_increment_reduction_time: new Date(now).toISOString(), // Reset the timer for the next reduction
          current_lot_end_time: newTimerEndTime, // Update the timer end time
        });
        this.logger.log(
          `[Backend Timer] Lot ${lot.id}: Updated inactivity_periods, last_increment_reduction_time, and current_lot_end_time to ${newTimerEndTime} for auction state ${latestAuctionState.id}.`,
        );

        // Exit the processing for this cycle to avoid timer checks with stale data
        // The next timer tick will pick up the updated state.
        this.logger.log(
          `[Backend Timer] Lot ${lot.id}: Inactivity increment processed, returning.`,
        );
        return;
      }

      // --- Check for Timer Expiry and Conclude Lot ---
      // This check happens only if the inactivity increment logic didn't execute and return.
      // We re-fetch the latest auction state one more time to ensure we have the most recent timer end time
      // in case it was updated by a recent bid just before this check.
      const latestAuctionStateBeforeExpiryCheck = await pb
        .collection('auction_state')
        .getOne<AuctionStateRecord>(auctionState.id);

      const latestTimerEndTime =
        latestAuctionStateBeforeExpiryCheck.current_lot_end_time
          ? new Date(
              latestAuctionStateBeforeExpiryCheck.current_lot_end_time,
            ).getTime()
          : now; // Fallback

      // Conclude the lot if the current time is past the latest timer end time
      if (now >= latestTimerEndTime) {
        this.logger.log(`[Backend Timer] Lot ${lot.id} timer expired.`);

        // Conclude the lot in PocketBase lots_realtime
        await pb
          .collection('lots_realtime')
          .update(lot.id, { Concluded: true, lot_status: 'completed' }); // Also set lot_status to completed
        this.logger.log(
          `[Backend Timer] Lot ${lot.id} marked as Concluded and status completed.`,
        );

        // Trigger Advancement to Next Lot for this auction state
        await this.advanceAuctionToNextLot(
          latestAuctionStateBeforeExpiryCheck, // Pass the latest auction state
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[Backend Timer] Error processing timer for lot ${lot.id}:`,
        error.message || error,
      );
    }
  }

  // Auction Advancement Logic (Triggered when a lot concludes)
  private async advanceAuctionToNextLot(auctionState: AuctionStateRecord) {
    this.logger.log(
      `[Backend Advancement] Advancing auction lots for Directus Auction ID: ${auctionState.directus_auction_id}`,
    );
    try {
      const pb = this.pocketBaseService.adminClient;

      // Find the first unconcluded lot related to this Directus Auction ID, ordered by created date
      try {
        const firstUnconcludedLot = await pb
          .collection('lots_realtime')
          .getFirstListItem<RealtimeLotRecord>(
            `auction = "${auctionState.directus_auction_id}" && Concluded = false`, // Filter by Directus Auction ID and not concluded
            { sort: 'created' }, // Sort by created date to get the next lot (oldest)
          );

        const now = new Date();
        const nextLotEndTime = new Date(
          now.getTime() + this.BASE_TIMER_DURATION,
        ).toISOString();

        // If there is an unconcluded lot, update the auction_state's current_lot and timer state
        this.logger.log(
          `[Backend Advancement] Setting next active lot for Directus Auction ID ${auctionState.directus_auction_id} to PocketBase lot ${firstUnconcludedLot.id}`,
        );
        await pb.collection('auction_state').update(auctionState.id, {
          current_lot: firstUnconcludedLot.id, // Set the next lot's PocketBase ID
          current_lot_end_time: nextLotEndTime, // Set the timer end time for the next lot
          inactivity_periods: 0, // Reset inactivity periods for the new lot
          last_increment_reduction_time: now.toISOString(), // Reset last reduction time for the new lot
        });

        // Optional: Update the status of the new current lot to 'ongoing'
        try {
          await pb.collection('lots_realtime').update(firstUnconcludedLot.id, {
            lot_status: 'ongoing', // Assuming 'lot_status' field exists
          });
          this.logger.log(
            `[Backend Advancement] Updated new current lot ${firstUnconcludedLot.id} status to ongoing.`,
          );
        } catch (lotStatusUpdateError: any) {
          this.logger.error(
            `[Backend Advancement] Error updating status for new lot ${firstUnconcludedLot.id}:`,
            lotStatusUpdateError.message || lotStatusUpdateError,
          );
        }

        // --- Sync *Directus* current_lot_id back to Directus ---
        try {
          await this.directusService.updateItem(
            'auctions',
            auctionState.directus_auction_id,
            {
              current_lot_id: firstUnconcludedLot.directus_id, // *** Use the Directus Lot ID from the PocketBase record ***
              // Optionally sync status to Directus if needed, but PB auction_state is source of truth
              status: 'active', // Assuming 'status' field exists in Directus auctions
            },
          );
          this.logger.log(
            `[Backend Advancement] Synced Directus auction ${auctionState.directus_auction_id} with Directus current_lot_id: ${firstUnconcludedLot.directus_id}`,
          );
        } catch (directusError: any) {
          this.logger.error(
            `[Backend Advancement] Failed to sync Directus current_lot_id to Directus for auction ${auctionState.directus_auction_id}:`,
            directusError.message || directusError,
          );
        }
      } catch (error) {
        // If no unconcluded lots are found, this will throw an error from getFirstListItem
        // This means we've concluded all lots
        this.logger.log(
          `[Backend Advancement] No more unconcluded lots found for Directus Auction ID ${auctionState.directus_auction_id}. Concluding auction.`,
        );

        // Mark the overall auction_state as completed
        await pb.collection('auction_state').update(auctionState.id, {
          status: 'completed',
          current_lot: null, // Clear the current_lot
          current_lot_end_time: null, // Clear the timer end time
          inactivity_periods: 0, // Reset inactivity periods
          last_increment_reduction_time: null, // Clear last reduction time
        });

        this.logger.log(
          `[Backend Advancement] Auction state ${auctionState.id} (Directus ID: ${auctionState.directus_auction_id}) marked as completed.`,
        );

        // Optional: Update the Directus auction record status as well using the injected service
        try {
          await this.directusService.updateItem(
            'auctions',
            auctionState.directus_auction_id,
            {
              status: 'completed', // Sync status to Directus
              current_lot_id: null, // Ensure current_lot_id is null in Directus
            },
          );
          this.logger.log(
            `[Backend Advancement] Updated Directus auction ${auctionState.directus_auction_id} status to completed and cleared current_lot_id.`,
          );
        } catch (directusUpdateError: any) {
          this.logger.error(
            `[Backend Advancement] Error updating Directus auction ${auctionState.directus_auction_id} status:`,
            directusUpdateError.message || directusUpdateError,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        '[Backend Advancement] Error advancing auction lots:',
        error.message || error,
      );
    }
  }

  // Server-Side Increment Calculation
  // Calculates the required increment based on the lot's state and inactivity periods.
  private calculateServerIncrement(
    lot: RealtimeLotRecord,
    auctionState: AuctionStateRecord, // Use auctionState for inactivity periods
  ): number {
    const baseIncrement = Number(lot.increment_amount) || 100;

    let incrementMultiplier = 1;

    // Apply reductions based on inactivity periods count from auctionState
    if (auctionState.inactivity_periods === 1) {
      incrementMultiplier = 2 / 3; // Reduce to 2/3 of base after 1 period
    } else if (auctionState.inactivity_periods === 2) {
      incrementMultiplier = 1 / 3; // Reduce to 1/3 of base after 2 periods
    } else if (auctionState.inactivity_periods >= this.MAX_INACTIVITY_PERIODS) {
      // After max periods, apply a minimum multiplier
      incrementMultiplier = 0.1; // Example minimum 10% of base
    }

    // Ensure increment is rounded and at least 1
    const finalIncrement = Math.max(
      1,
      Math.round(baseIncrement * incrementMultiplier),
    );

    // Log the calculation details
    this.logger.log(
      `[Increment Calc] Lot ${lot.id}: Base Increment: ${baseIncrement}, Inactivity Periods: ${auctionState.inactivity_periods}, Multiplier: ${incrementMultiplier.toFixed(2)}, Final Calculated Increment: ${finalIncrement}`,
    );

    return finalIncrement;
  }

  // --- Bid Processing Logic (Called by Controller) ---
  // Updated to accept directusLotId and find the PocketBase Lot ID internally
  async processBid(
    directusLotId: string, // Accept the Directus Lot ID from the frontend/controller
    bidAmount: number,
    userId: string, // This is the PocketBase User ID from the authenticated request
  ): Promise<any> {
    this.logger.log(
      `[Auction Service] Processing bid for Directus lot ${directusLotId} from user ${userId} with amount ${bidAmount}`,
    );

    const pb = this.pocketBaseService.adminClient;

    try {
      // Find the PocketBase Lot Record using the Directus Lot ID
      // This assumes your 'lots_realtime' collection has a 'directus_id' field
      // that stores the original Directus Lot ID.
      const lot = await pb
        .collection('lots_realtime')
        .getFirstListItem<RealtimeLotRecord>(
          `directus_id = "${directusLotId}"`, // Filter by Directus Lot ID
          { expand: 'auction' }, // Expand auction relation to get Directus Auction ID
        );

      const lotId = lot.id; // Get the PocketBase ID of the lot

      // Find the auction_state record linked to this lot's Directus Auction ID
      // The 'auction' field on lots_realtime should store the Directus Auction ID.
      const auctionState = await pb
        .collection('auction_state')
        .getFirstListItem<AuctionStateRecord>(
          `directus_auction_id = "${lot.auction}"`, // Filter by Directus Auction ID stored on the lot
        );

      // --- VALIDATION ---
      // Check if the auction state exists, is active, if this lot is the current_lot, and if the lot is not concluded
      // Note: auctionState.current_lot is the PocketBase ID, so we compare it with lotId
      if (
        !auctionState ||
        auctionState.status !== 'active' ||
        auctionState.current_lot !== lotId || // Compare with PocketBase Lot ID
        lot.Concluded === true
      ) {
        let message = 'Bidding for this lot is currently closed or not active.';
        if (!auctionState) message = 'Auction state not found for this lot.';
        else if (auctionState.status !== 'active')
          message = 'The auction is not currently active.';
        else if (auctionState.current_lot !== lotId)
          // Compare with PocketBase Lot ID
          message = 'This is not the current lot for bidding.';
        else if (lot.Concluded === true)
          message = 'This lot is already concluded.';

        this.logger.warn(
          `[Auction Service] Bid rejected for Directus lot ${directusLotId} (PB ID: ${lotId}): ${message}`,
        );
        throw new BadRequestException(message);
      }

      // Need to confirm 'starting_price' and 'increment_amount' exist on RealtimeLotRecord
      const currentBid =
        parseFloat(lot.current_bid as any) ||
        parseFloat(lot.starting_price as any) ||
        0;

      // Log the current bid amount before calculating the required bid
      this.logger.log(
        `[Auction Service] Directus lot ${directusLotId} (PB ID: ${lotId}): Current bid is ${currentBid}.`,
      );

      // Use the auctionState to calculate the required bid based on current inactivity periods
      const requiredBid =
        currentBid + this.calculateServerIncrement(lot, auctionState); // Pass auctionState

      if (Number(bidAmount) < requiredBid) {
        this.logger.warn(
          `[Auction Service] Bid rejected: Bid amount ${bidAmount} is less than required minimum ${requiredBid} for Directus lot ${directusLotId} (PB ID: ${lotId})`,
        );
        throw new BadRequestException(`Bid must be at least ${requiredBid}.`);
      }

      // 2. Place the new bid record in PocketBase
      // Use the PocketBase Lot ID for the bid record
      const newBidRecord = await pb.collection('bids').create({
        lot_id: lotId, // PocketBase ID of the lot
        user_id: userId, // Use the authenticated user ID (PocketBase User ID string)
        amount: Number(bidAmount), // Ensure amount is a number
        date_created: new Date().toISOString(), // Server timestamp
      });
      this.logger.log(
        `[Auction Service] New bid created in PocketBase: ${newBidRecord.id} for lot PB ID ${lotId}`,
      );

      // --- Reverted: Removed Directus Bid Sync Logic Here ---
      // The logic to sync bids to Directus has been removed as requested.
      // If you need bid history in Directus, you would need a separate mechanism
      // to sync bids from PocketBase to Directus, perhaps a webhook or a scheduled sync task.
      // --- End Reverted ---

      // 3. Update the lot record with the new highest bid and last bid time
      // Use the PocketBase Lot ID for the update
      await pb.collection('lots_realtime').update(lotId, {
        current_bid: Number(bidAmount),
        current_bidder: userId, // Use the authenticated user ID (PocketBase User ID string)
        last_bid_time: new Date().toISOString(),
        // lot_status might be updated here if a bid changes its status back to ongoing,
        // but the timer logic also handles setting it to completed.
      });
      this.logger.log(
        `[Auction Service] Lot PB ID ${lotId} updated with new bid info in PocketBase.`,
      );

      // Reset inactivity periods and last reduction time on ANY valid bid
      const now = new Date();
      const nowTime = now.getTime();

      // Reset inactivity tracking in the database
      // Also reset the timer end time to BASE_TIMER_DURATION from now on a new bid
      const newEndTimeOnBid = new Date(
        nowTime + this.BASE_TIMER_DURATION,
      ).toISOString();

      await pb.collection('auction_state').update(auctionState.id, {
        inactivity_periods: 0, // Reset inactivity periods
        last_increment_reduction_time: new Date(now).toISOString(), // Reset last reduction time to now
        current_lot_end_time: newEndTimeOnBid, // Reset timer to base duration on bid
        // Ensure lot_status is 'ongoing' if a bid comes in and it wasn't completed
        status:
          auctionState.status === 'active' ? 'active' : auctionState.status, // Keep auction state active
      });
      this.logger.log(
        `[Auction Service] Bid placed for lot PB ID ${lotId}. Reset inactivity periods, last reduction time, and timer end time to ${newEndTimeOnBid} for auction state ${auctionState.id}.`,
      );

      return {
        success: true,
        message: 'Bid placed successfully!',
        newBid: Number(bidAmount),
        lotStatus: 'ongoing', // Assuming lot is ongoing after a successful bid
      };
    } catch (error: any) {
      this.logger.error(
        `[Auction Service] Error processing bid for Directus lot ${directusLotId}:`,
        error.message || error,
      );
      // Re-throw specific exceptions or wrap other errors in InternalServerErrorException
      if (error instanceof BadRequestException) {
        throw error; // Re-throw NestJS HTTP exceptions
      }
      // Wrap other errors in a generic exception or log them
      throw new Error(
        `Failed to place bid: ${error.message || 'Internal server error'}`,
      );
    }
  }
}
