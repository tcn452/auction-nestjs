/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/auction/auction.controller.ts
import { Controller, Post, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { AuthGuard } from 'src/auth/auth.guard'; // Import your AuthGuard
import { Request } from 'express'; // Import Request from express for typing req.user

@Controller('api') // Base path for your API routes
export class AuctionController {
  private readonly logger = new Logger(AuctionController.name);

  constructor(private auctionService: AuctionService) {}

  @UseGuards(AuthGuard) // Protect this route with the AuthGuard
  @Post('bid')
  async placeBid(
    @Body() bidData: { lotId: string; bidAmount: number },
    @Req() req: Request & { user?: { id: string } }, // Extend Request type to include user property
  ) {
    const userId = req.user?.id; // Get user ID from the authenticated request
    console.log(bidData); // Log the bid data for debugging
    if (!userId) {
      // This check should ideally be handled by the AuthGuard,
      // but keeping it here adds an extra layer of safety.
      this.logger.error('User ID not found on authenticated request.');
      // The AuthGuard should throw UnauthorizedException already
      // but if somehow reached here, you might throw an error or return an error response.
      throw new Error('Authenticated user ID is missing.'); // Or return a specific error response
    }

    this.logger.log(
      `Received bid for lot ${bidData.lotId} from user ${userId} with amount ${bidData.bidAmount}`,
    );

    try {
      const result = await this.auctionService.processBid(
        bidData.lotId,
        bidData.bidAmount,
        userId, // Pass the authenticated user ID to the service
      );
      return result; // Return the success/failure result
    } catch (error: any) {
      this.logger.error('Error processing bid:', error.message);
      // Re-throw the error or return an appropriate error response
      throw error; // Let NestJS handle the exception and return an appropriate HTTP response
    }
  }
}
