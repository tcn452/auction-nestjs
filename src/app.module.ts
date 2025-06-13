// src/app.module.ts (Root Module)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // For environment variable management
import { ScheduleModule } from '@nestjs/schedule'; // For scheduling tasks
import { AuctionModule } from './auction/auction.module'; // Import your Auction module
import { AuthModule } from './auth/auth.module'; // Import your Auth module

import { DirectusModule } from './directus/directus.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Load environment variables
      isGlobal: true, // Make config available globally
    }),
    ScheduleModule.forRoot(), // Initialize scheduler
    AuthModule, // Register Auth module
    AuctionModule,
    DirectusModule, // Register Auction module
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
