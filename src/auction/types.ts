import Record from 'pocketbase';

// Define types for your PocketBase collections
// Ensure these match your actual PocketBase schema based on API previews
// Extend the base PocketBase Record type
export interface RealtimeLotRecord extends Record {
  created: string; // Datetime field for creation time
  id: string; // PocketBase ID (string)
  current_bid?: number;
  current_bidder_id?: string; // Corrected field name based on preview (PocketBase User ID string)
  Concluded?: boolean; // Boolean field
  last_bid_time?: string; // ISO string (datetime)
  extension_time?: number; // Assuming this is a number based on typical usage, correct if string
  directus_id?: string; // Added based on preview (Directus Lot ID string)
  auction?: string; // Directus Auction ID (string) - based on preview
  order?: number; // Number field for sequence - Assuming this exists for sorting
  increment_amount?: number; // Assuming this exists for bid calculation
  reserve_price?: number; // Assuming this exists
  starting_price?: number; // Number field - Assuming this exists

  // Add other fields from your lots_realtime collection as needed

  // Define expand property for relations you might expand
  expand?: object;
}

// Define type for the new 'auction_state' collection in PocketBase
// Ensure field names and types match your actual collection schema
export interface AuctionStateRecord extends Record {
  id: string; // PocketBase ID (string)
  directus_auction_id: string; // Link to the Directus Auction (string)
  status: 'pending' | 'active' | 'completed' | 'error'; // Text field with specific values
  inactivity_periods: number; // Number field for inactivity periods
  last_increment_reduction_time: string | null; // Datetime field for last increment reduction time, or nul
  start_time: string; // Datetime field for the scheduled start time
  current_lot: string | null; // Relation field to lots_realtime (PocketBase ID string), or null
  current_lot_end_time?: string; // Optional field for the end time of the current lot
  // Add other fields to your auction_state collection as needed
  created: string; // Datetime field for creation time
  // Define expand property for relations you might expand
  expand?: {
    current_lot?: RealtimeLotRecord; // Expanding the current_lot relation
    // If directus_auction_id is a relation to a mirrored Directus Auctions collection
    // directus_auction_id?: DirectusAuctionMirrorRecord; // Example
  };
}

// Define type for the 'bids' collection if needed elsewhere (already in service logic)
export interface BidRecord extends Record {
  lot_id: string; // Relation ID to lots_realtime
  user_id: string; // Relation ID to users
  amount: number;
  date_created: string;
  proxy_bid?: boolean;
  // Add other bid fields
}

// Add other types if needed (e.g., UserRecord if you need more than just ID)
export interface UserRecord extends Record {
  // User fields from your PocketBase users collection
  email: string;
  // ... other user fields you access
}
