// src/directus/directus.module.ts
import { Module, Global } from '@nestjs/common';
import { DirectusService } from './directus.service'; // Import the service

@Global() // Optional: Makes DirectusService available globally without explicit imports in other modules
@Module({
  providers: [DirectusService], // <--- IMPORTANT: List DirectusService here as a provider
  exports: [DirectusService], // <--- IMPORTANT: Export DirectusService so other modules can use it
})
export class DirectusModule {}
