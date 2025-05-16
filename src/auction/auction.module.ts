// src/auction/auction.module.ts
import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { PocketBaseModule } from 'src/pocketbase/pocketbase.module'; // Import PocketBase module
import { ScheduleModule } from '@nestjs/schedule'; // Import ScheduleModule
import { DirectusModule } from 'src/directus/directus.module';

@Module({
  imports: [
    PocketBaseModule, // AuctionService needs PocketBaseService
    ScheduleModule.forRoot(), // Import ScheduleModule here as well if using @Interval in AuctionService
    DirectusModule, // Import DirectusModule if needed
  ],
  controllers: [AuctionController],
  providers: [AuctionService], // Register AuctionService
})
export class AuctionModule {}
