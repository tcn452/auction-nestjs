/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/pocketbase/pocketbase.service.ts
import { Injectable, Logger } from '@nestjs/common';
import PocketBase from 'pocketbase';
import { ConfigService } from '@nestjs/config'; // To access environment variables

@Injectable()
export class PocketBaseService {
  private readonly logger = new Logger(PocketBaseService.name);
  private readonly pb: PocketBase;
  private readonly adminPb: PocketBase; // Separate instance for admin operations

  constructor(private configService: ConfigService) {
    const pocketbaseUrl = this.configService.get<string>('POCKETBASE_URL');
    if (!pocketbaseUrl) {
      this.logger.error('POCKETBASE_URL environment variable is not set.');
      process.exit(1); // Exit if essential config is missing
    }
    this.pb = new PocketBase(pocketbaseUrl); // Instance for client-side like operations (user auth)
    this.adminPb = new PocketBase(pocketbaseUrl); // Separate instance for admin operations

    // Authenticate admin on service initialization
    this.authenticateAdmin();
  }

  // Authenticate as admin
  private async authenticateAdmin() {
    const adminEmail = this.configService.get<string>('POCKETBASE_ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>(
      'POCKETBASE_ADMIN_PASSWORD',
    );

    if (!adminEmail || !adminPassword) {
      this.logger.error(
        'PocketBase admin credentials environment variables are not set.',
      ); // In production, you might want to throw an error or exit here
      return;
    }

    try {
      if (!this.adminPb.authStore.isValid) {
        this.logger.log('[PocketBase Admin Auth] Authenticating as admin...');
        await this.adminPb
          .collection('_superusers')
          .authWithPassword(adminEmail, adminPassword);
        this.logger.log('[PocketBase Admin Auth] Authentication successful.');
      } else {
        this.logger.log('[PocketBase Admin Auth] Already authenticated.');
      }
    } catch (error: any) {
      this.logger.error(
        '[PocketBase Admin Auth] Authentication failed.',
        error,
      );
      // Implement retry logic or alerting in production
    }
  }

  // Get the admin PocketBase client instance
  get adminClient(): PocketBase {
    // In a production app, you might want to add a check here to ensure admin is authenticated
    this.adminPb.autoCancellation(false); // Disable auto-cancellation for admin operations
    return this.adminPb;
  }

  // Get a new PocketBase client instance for user authentication (per request)
  // This is safer than using a shared instance for user auth
  createUserClient(): PocketBase {
    const pocketbaseUrl = this.configService.get<string>('POCKETBASE_URL');
    if (!pocketbaseUrl) {
      // This should ideally not happen if checked on startup, but good practice
      throw new Error('PocketBase URL is not configured.');
    }
    return new PocketBase(pocketbaseUrl);
  }
}
