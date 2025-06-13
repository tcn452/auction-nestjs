// src/auction/auction.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DirectusService } from 'src/directus/directus.service';
import { Auctions, Lots } from './types';

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  // --- Constants for Live Auctions ---
  private readonly BASE_TIMER_DURATION = 30 * 1000;
  private readonly GRACE_PERIOD_DURATION = 30 * 1000;
  private readonly INACTIVITY_THRESHOLD = 10 * 1000;
  private readonly HIGH_ACTIVITY_THRESHOLD = 10 * 1000;
  private readonly HIGH_ACTIVITY_BID_COUNT = 3;
  private readonly MAX_INACTIVITY_PERIODS = 3;
  private readonly MAX_ACTIVITY_LEVEL = 2;
  private readonly SKIP_RECENTLY_ACTIVATED_THRESHOLD = 2000;

  constructor(private directusService: DirectusService) {}

  // This timer handles state transitions for LIVE auctions
  @Interval(15000)
  async handleLiveAuctionTransitions() {
    const now = new Date();
    const nowISO = now.toISOString();

    // Start scheduled LIVE auctions
    try {
      const scheduledAuctions = await this.directusService.readItems<
        'auctions',
        Auctions
      >('auctions', {
        filter: {
          status: { _eq: 'scheduled' },
          auction_type: { _eq: 'Live' },
        },
      });
      const auctionsToActivate = scheduledAuctions.filter(
        (auction) => new Date(auction.start_date as string) <= now,
      );
      if (auctionsToActivate.length > 0) {
        for (const auction of auctionsToActivate) {
          await this.activateAuction(auction, now);
        }
      }
    } catch (error: any) {
      this.logger.error(
        '[Activation] Error starting live auctions:',
        error.message,
      );
    }

    // End grace periods for LIVE auctions
    try {
      const intermissionAuctions = await this.directusService.readItems<
        'auctions',
        Auctions
      >('auctions', {
        filter: {
          status: { _eq: 'intermission' },
          auction_type: { _eq: 'Live' },
          next_lot_start_time: { _lte: nowISO },
        },
      });
      if (intermissionAuctions.length > 0) {
        for (const auction of intermissionAuctions) {
          await this.startNextLot(auction, now);
        }
      }
    } catch (error: any) {
      this.logger.error(
        '[Intermission] Error ending grace period:',
        error.message,
      );
    }
  }

  // This timer manages active LIVE auctions
  @Interval(1000)
  async handleLiveActiveAuctions() {
    try {
      const activeAuctions = await this.directusService.readItems<
        'auctions',
        Auctions
      >('auctions', {
        filter: { status: { _eq: 'active' }, auction_type: { _eq: 'Live' } },
        fields: ['*', 'current_lot.*'],
      });

      for (const auction of activeAuctions) {
        if (
          !auction.current_lot_end_time ||
          !auction.last_activity_time ||
          Date.now() - new Date(auction.last_activity_time).getTime() <
            this.SKIP_RECENTLY_ACTIVATED_THRESHOLD
        ) {
          continue;
        }

        const currentLot = auction.current_lot as Lots;
        if (!currentLot) {
          await this.checkAndConcludeAuctionIfNeeded(auction);
          continue;
        }

        const timerEndTime = new Date(auction.current_lot_end_time).getTime();
        if (Date.now() >= timerEndTime) {
          await this.directusService.updateItem('lots', currentLot.id, {
            lot_status: 'completed',
          });
          await this.advanceAuctionToNextLot(auction);
          continue;
        }

        const timeSinceLastActivity =
          Date.now() - new Date(auction.last_activity_time).getTime();
        if (timeSinceLastActivity >= this.INACTIVITY_THRESHOLD) {
          const expectedPeriods = Math.floor(
            timeSinceLastActivity / this.INACTIVITY_THRESHOLD,
          );
          const newPeriods = Math.min(
            expectedPeriods,
            this.MAX_INACTIVITY_PERIODS,
          );
          if (newPeriods > auction.inactivity_periods) {
            await this.directusService.updateItem('auctions', auction.id, {
              inactivity_periods: newPeriods,
            });
          }
        }
      }
    } catch (error: any) {
      this.logger.error(
        '[Active Timer] Error processing live auctions:',
        error.message,
      );
    }
  }

  // This timer concludes TIMED auctions
  @Interval(60000)
  async handleTimedAuctionConclusion() {
    try {
      const now = new Date();
      const activeTimedAuctions = await this.directusService.readItems<
        'auctions',
        Auctions
      >('auctions', {
        filter: {
          status: { _eq: 'active' },
          auction_type: { _eq: 'Timed Auction' },
          end_date: { _lte: now.toISOString() },
        },
      });

      for (const auction of activeTimedAuctions) {
        this.logger.log(
          `[Timed Conclusion] Timed auction ${auction.id} has ended. Setting status to completed.`,
        );
        await this.directusService.updateItem('auctions', auction.id, {
          status: 'completed',
        });
      }
    } catch (error: any) {
      this.logger.error(
        '[Timed Conclusion] Error concluding timed auctions:',
        error.message,
      );
    }
  }

  async processBid(
    lotId: string,
    bidAmount: number,
    userId: string,
  ): Promise<any> {
    this.logger.log(
      `[Bid] Processing bid for lot ${lotId} from user ${userId} for ${bidAmount}`,
    );
    try {
      const lot = await this.directusService.readItem<'lots', Lots>(
        'lots',
        lotId,
        { fields: ['*', 'auction.*'] },
      );
      const auction = lot.auction as Auctions;

      if (!auction || auction.status !== 'active') {
        throw new BadRequestException('This auction is not currently active.');
      }

      if (auction.auction_type === 'Live') {
        return this.processLiveBid(lot, auction, bidAmount, userId);
      } else if (auction.auction_type === 'Timed Auction') {
        return this.processTimedBid(lot, auction, bidAmount, userId);
      } else {
        throw new BadRequestException('Unsupported auction type.');
      }
    } catch (error: any) {
      this.logger.error(
        `[Bid] Error processing bid for lot ${lotId}:`,
        error.message,
      );
      if (error instanceof BadRequestException) throw error;
      throw new Error('Failed to place bid.');
    }
  }

  private async processLiveBid(
    lot: Lots,
    auction: Auctions,
    bidAmount: number,
    userId: string,
  ): Promise<any> {
    if (auction.current_lot !== lot.id || lot.lot_status === 'completed') {
      throw new BadRequestException('Bidding for this lot is not active.');
    }

    const currentBid =
      Number(lot.current_bid) || Number(lot.starting_price) || 0;
    const increment = this.calculateBidIncrement(lot, auction);
    const requiredBid = currentBid + increment;

    if (bidAmount < requiredBid) {
      throw new BadRequestException(`Bid must be at least ${requiredBid}.`);
    }

    const now = new Date();
    const nowTime = now.getTime();
    let recentTimestamps = (
      Array.isArray(auction.recent_bid_timestamps)
        ? auction.recent_bid_timestamps
        : []
    ) as number[];
    recentTimestamps.push(nowTime);
    recentTimestamps = recentTimestamps.filter((ts) => nowTime - ts < 15000);

    let newActivityLevel = auction.activity_level;
    const timerEndTime = new Date(
      auction.current_lot_end_time as string,
    ).getTime();
    if (timerEndTime - nowTime < this.HIGH_ACTIVITY_THRESHOLD) {
      if (recentTimestamps.length >= this.HIGH_ACTIVITY_BID_COUNT) {
        newActivityLevel = Math.min(
          auction.activity_level + 1,
          this.MAX_ACTIVITY_LEVEL,
        );
        if (newActivityLevel > auction.activity_level) {
          recentTimestamps = [];
        }
      }
    }

    const reservePrice = Number(lot.reserve_price) || 0;
    const isBelowReserve = reservePrice > 0 && bidAmount < reservePrice;

    await this.directusService.createItem('Bids', {
      lot: lot.id,
      user: userId,
      amount: bidAmount,
    });
    await this.directusService.updateItem('lots', lot.id, {
      current_bid: bidAmount,
      current_bidder: userId,
      STC: reservePrice > 0 ? isBelowReserve : lot.STC,
    });
    await this.directusService.updateItem('auctions', auction.id, {
      inactivity_periods: 0,
      last_activity_time: now.toISOString(),
      current_lot_end_time: new Date(
        nowTime + this.BASE_TIMER_DURATION,
      ).toISOString(),
      recent_bid_timestamps: recentTimestamps,
      activity_level: newActivityLevel,
    });

    const stcMessage =
      reservePrice > 0
        ? isBelowReserve
          ? ' (Subject to Confirmation)'
          : ' (Reserve Met)'
        : '';
    return { success: true, message: `Bid placed successfully!${stcMessage}` };
  }

  private async processTimedBid(
    lot: Lots,
    auction: Auctions,
    bidAmount: number,
    userId: string,
  ): Promise<any> {
    const now = new Date();
    const auctionEndDate = new Date(auction.end_date as string);

    if (now > auctionEndDate) {
      throw new BadRequestException('This auction has already ended.');
    }

    const currentBid =
      Number(lot.current_bid) || Number(lot.starting_price) || 0;
    const increment = Number(lot.increment_amount) || 100;
    const requiredBid = currentBid + increment;

    if (bidAmount < requiredBid) {
      throw new BadRequestException(`Bid must be at least ${requiredBid}.`);
    }

    const extensionMinutes = Number(auction.extension_time) || 5;
    const timeUntilEnd = auctionEndDate.getTime() - now.getTime();
    let newEndDate = auction.end_date;

    if (timeUntilEnd < extensionMinutes * 60 * 1000) {
      const newEndDateObj = new Date(
        now.getTime() + extensionMinutes * 60 * 1000,
      );
      newEndDate = newEndDateObj.toISOString();
      await this.directusService.updateItem('auctions', auction.id, {
        end_date: newEndDate,
      });
    }

    await this.directusService.createItem('Bids', {
      lot: lot.id,
      user: userId,
      amount: bidAmount,
    });

    const reservePrice = Number(lot.reserve_price) || 0;
    const isBelowReserve = reservePrice > 0 && bidAmount < reservePrice;
    await this.directusService.updateItem('lots', lot.id, {
      current_bid: bidAmount,
      current_bidder: userId,
      STC: reservePrice > 0 ? isBelowReserve : lot.STC,
    });

    const stcMessage =
      reservePrice > 0
        ? isBelowReserve
          ? ' (Subject to Confirmation)'
          : ' (Reserve Met)'
        : '';
    return {
      success: true,
      message: `Bid placed successfully!${stcMessage}`,
      newEndDate: newEndDate,
    };
  }

  private async activateAuction(auction: Auctions, now: Date) {
    try {
      const firstLot = (
        await this.directusService.readItems<'lots', Lots>('lots', {
          filter: {
            auction: { _eq: auction.id },
            lot_status: { _neq: 'completed' },
          },
          sort: ['date_created'],
          limit: 1,
        })
      )[0];

      if (firstLot) {
        await this.directusService.updateItem('auctions', auction.id, {
          status: 'active',
          current_lot: firstLot.id,
          current_lot_end_time: new Date(
            now.getTime() + this.BASE_TIMER_DURATION,
          ).toISOString(),
          inactivity_periods: 0,
          activity_level: 0,
          recent_bid_timestamps: [],
          last_activity_time: now.toISOString(),
        });
        await this.directusService.updateItem('lots', firstLot.id, {
          lot_status: 'ongoing',
        });
        this.logger.log(
          `[Activation] Auction ${auction.id} activated. Current lot: ${firstLot.id}.`,
        );
      } else {
        await this.directusService.updateItem('auctions', auction.id, {
          status: 'error',
        });
      }
    } catch (error: any) {
      this.logger.error(
        `[Activation] Error activating auction ${auction.id}:`,
        error.message,
      );
    }
  }

  private async startNextLot(auction: Auctions, now: Date) {
    const currentLotId =
      (auction.current_lot as any)?.id || auction.current_lot;
    if (!currentLotId) return;
    try {
      await this.directusService.updateItem('auctions', auction.id, {
        status: 'active',
        current_lot_end_time: new Date(
          now.getTime() + this.BASE_TIMER_DURATION,
        ).toISOString(),
        inactivity_periods: 0,
        activity_level: 0,
        recent_bid_timestamps: [],
        last_activity_time: now.toISOString(),
        next_lot_start_time: null,
      });
      await this.directusService.updateItem('lots', currentLotId, {
        lot_status: 'ongoing',
      });
      this.logger.log(
        `[Intermission] Grace period ended for auction ${auction.id}. Lot ${currentLotId} is now active.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Intermission] Error starting lot for auction ${auction.id}:`,
        error.message,
      );
    }
  }

  private async advanceAuctionToNextLot(auction: Auctions) {
    try {
      const nextLot = (
        await this.directusService.readItems<'lots', Lots>('lots', {
          filter: {
            auction: { _eq: auction.id },
            lot_status: { _neq: 'completed' },
          },
          sort: ['date_created'],
          limit: 1,
        })
      )[0];

      if (nextLot) {
        await this.directusService.updateItem('auctions', auction.id, {
          status: 'intermission',
          current_lot: nextLot.id,
          current_lot_end_time: null,
          next_lot_start_time: new Date(
            Date.now() + this.GRACE_PERIOD_DURATION,
          ).toISOString(),
          inactivity_periods: 0,
          activity_level: 0,
          recent_bid_timestamps: [],
        });
        this.logger.log(
          `[Advancement] Auction ${auction.id} entering grace period. Next lot: ${nextLot.id}.`,
        );
      } else {
        await this.checkAndConcludeAuctionIfNeeded(auction);
      }
    } catch (error: any) {
      this.logger.error(
        `[Advancement] Error advancing auction ${auction.id}:`,
        error.message,
      );
    }
  }

  private async checkAndConcludeAuctionIfNeeded(auction: Auctions) {
    const result = await this.directusService.aggregate('lots', {
      query: {
        filter: {
          auction: { _eq: auction.id },
          lot_status: { _neq: 'completed' },
        },
      },
      aggregate: {
        count: '*',
      },
    });

    const count = Number(result[0]?.count || 0);

    if (count === 0) {
      this.logger.log(
        `[Conclusion] No lots left. Concluding auction ${auction.id}.`,
      );
      await this.directusService.updateItem('auctions', auction.id, {
        status: 'completed',
        current_lot: null,
      });
    }
  }

  private calculateBidIncrement(lot: Lots, auction: Auctions): number {
    if (auction.activity_level > 0) {
      if (auction.activity_level >= 2) {
        return (
          Number((lot as any).increment_highest) || Number(lot.increment_amount)
        );
      }
      if (auction.activity_level === 1) {
        return (
          Number((lot as any).increment_higher) || Number(lot.increment_amount)
        );
      }
    }

    if (auction.inactivity_periods > 0) {
      if (lot.auto_increment) {
        const baseIncrement = Number(lot.increment_amount) || 100;
        let multiplier = 1;
        if (auction.inactivity_periods === 1) multiplier = 2 / 3;
        else if (auction.inactivity_periods === 2) multiplier = 1 / 3;
        else if (auction.inactivity_periods >= 3) multiplier = 1 / 6;
        return Math.max(1, Math.round(baseIncrement * multiplier));
      } else {
        if (auction.inactivity_periods >= 3) {
          return (
            Number((lot as any).increment_lowest) ||
            Number(lot.increment_amount)
          );
        }
        if (auction.inactivity_periods === 2) {
          return (
            Number((lot as any).increment_lower) || Number(lot.increment_amount)
          );
        }
        if (auction.inactivity_periods === 1) {
          return (
            Number((lot as any).increment_low) || Number(lot.increment_amount)
          );
        }
      }
    }

    return Number(lot.increment_amount) || 100;
  }
}
