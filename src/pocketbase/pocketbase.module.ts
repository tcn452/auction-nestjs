// src/pocketbase/pocketbase.module.ts
import { Module, Global } from '@nestjs/common';
import { PocketBaseService } from './pocketbase.service';

@Global() // Make the service available globally
@Module({
  providers: [PocketBaseService],
  exports: [PocketBaseService], // Export the service for use in other modules
})
export class PocketBaseModule {}
