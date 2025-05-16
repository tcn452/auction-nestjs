/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/directus/directus.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  createDirectus,
  rest,
  staticToken,
  readItems,
  readItem,
  updateItem,
  type DirectusClient,
  type RestClient,
  type StaticTokenClient,
} from '@directus/sdk';
import { ConfigService } from '@nestjs/config'; // To access environment variables

// Define your Directus schema types if you have them, or use 'any' for simplicity
// import { Schema } from './types'; // Example: import your schema types

@Injectable()
export class DirectusService implements OnModuleInit {
  private readonly logger = new Logger(DirectusService.name);
  // Use 'any' for the schema type if you don't have a defined schema
  private directus: DirectusClient<any> &
    RestClient<any> &
    StaticTokenClient<any>;

  constructor(private configService: ConfigService) {
    const directusUrl = this.configService.get<string>('DIRECTUS_URL');
    const directusToken = this.configService.get<string>('DIRECTUS_TOKEN'); // Assuming you use a static token for backend

    if (!directusUrl) {
      this.logger.error('DIRECTUS_URL environment variable is not set.');
      // In a real app, you might want to throw an error or exit here
      throw new Error('DIRECTUS_URL environment variable is not set.');
    }
    if (!directusToken) {
      this.logger.warn(
        'DIRECTUS_TOKEN environment variable is not set. Directus operations requiring authentication may fail.',
      );
      // Decide how critical this is for your application startup
    }

    this.directus = createDirectus<any>(directusUrl) // Use 'any' for schema
      .with(rest())
      .with(staticToken(directusToken as string)); // Use staticToken with your backend token
  }

  // Optional: Implement OnModuleInit to perform actions after the module is initialized
  async onModuleInit() {
    this.logger.log(
      `DirectusService initialized for URL: ${this.configService.get<string>('DIRECTUS_URL')}`,
    );

    // Optional: Perform a simple read to verify connection and authentication
    try {
      // Replace 'your_collection' with a collection you know exists
      // This attempts to read one item to confirm the connection and token are valid
      // Corrected: Pass 'any' as the Schema type argument
      await this.directus.request(
        readItems<any, any, any>('auctions', { limit: 1 }),
      );
      this.logger.log('Directus connection and authentication verified.');
    } catch (error: any) {
      this.logger.error(
        'Failed to verify Directus connection or authentication.',
        error.message,
      );
      // Decide how to handle this critical error in production
    }
  }

  /**
   * Wraps the Directus SDK's readItems function.
   * @param collection The collection name.
   * @param query The query options (filter, fields, sort, etc.).
   * @returns A promise resolving to an array of items of type T.
   */
  async readItems<Collection extends keyof any, T = any>(
    collection: Collection,
    query?: {
      filter?: any;
      fields?: any;
      sort?: string | string[];
      limit?: number;
      offset?: number;
      page?: number;
      search?: string;
      // Add other query options as needed
    },
  ): Promise<T[]> {
    this.logger.debug(
      `Reading items from collection: ${String(collection)} with query: ${JSON.stringify(query)}`,
    );
    try {
      // Corrected: Pass 'any' as the Schema type argument
      const items = await this.directus.request(
        readItems<any, any, any>(String(collection), query),
      );
      this.logger.debug(
        `Successfully read ${items.length} items from ${String(collection)}.`,
      );
      return items as T[];
    } catch (error: any) {
      this.logger.error(
        `Error reading items from ${String(collection)}:`,
        error.message,
      );
      throw error; // Re-throw the error for the calling service to handle
    }
  }

  /**
   * Wraps the Directus SDK's readItem function.
   * @param collection The collection name.
   * @param id The ID of the item to read.
   * @param query The query options (fields, etc.).
   * @returns A promise resolving to the item of type T.
   */
  async readItem<Collection extends keyof any, T = any>(
    collection: Collection,
    id: string | number,
    query?: {
      fields?: any;
      // Add other query options as needed
    },
  ): Promise<T> {
    this.logger.debug(
      `Reading item ${id} from collection: ${String(collection)} with query: ${JSON.stringify(query)}`,
    );
    try {
      // Corrected: Pass 'any' as the Schema type argument
      const item = await this.directus.request(
        readItem<any, any, any>(String(collection), id, query),
      );
      this.logger.debug(
        `Successfully read item ${id} from ${String(collection)}.`,
      );
      return item as T;
    } catch (error: any) {
      this.logger.error(
        `Error reading item ${id} from ${String(collection)}:`,
        error.message,
      );
      throw error; // Re-throw the error
    }
  }

  /**
   * Wraps the Directus SDK's updateItem function.
   * @param collection The collection name.
   * @param id The ID of the item to update.
   * @param item The partial item data to update.
   * @returns A promise resolving to the updated item of type T.
   */
  async updateItem<Collection extends keyof any, T = any>(
    collection: Collection,
    id: string | number,
    item: Partial<T>,
  ): Promise<T> {
    this.logger.debug(
      `Updating item ${id} in collection: ${String(collection)} with data: ${JSON.stringify(item)}`,
    );
    try {
      // Corrected: Pass 'any' as the Schema type argument
      const updatedItem = await this.directus.request(
        updateItem<any, any, any>(String(collection), id, item),
      );
      this.logger.debug(
        `Successfully updated item ${id} in ${String(collection)}.`,
      );
      return updatedItem as T;
    } catch (error: any) {
      this.logger.error(
        `Error updating item ${id} in ${String(collection)}:`,
        error.message,
      );
      throw error; // Re-throw the error for the calling service to handle
    }
  }

  // Add other methods as needed (e.g., createItem, deleteItem, etc.)
}
