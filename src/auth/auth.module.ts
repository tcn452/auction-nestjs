// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard'; // Import your AuthGuard


@Module({
  imports: [], // AuthGuard needs PocketBaseService
  providers: [AuthGuard],
  exports: [AuthGuard], // Export the guard for use in other modules
})
export class AuthModule {}
