// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard'; // Import your AuthGuard
import { PocketBaseModule } from 'src/pocketbase/pocketbase.module'; // Import PocketBase module

@Module({
  imports: [PocketBaseModule], // AuthGuard needs PocketBaseService
  providers: [AuthGuard],
  exports: [AuthGuard], // Export the guard for use in other modules
})
export class AuthModule {}
