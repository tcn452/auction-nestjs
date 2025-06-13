/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
export type Auctions = {
  extension_time: string;
  last_inactivity_update: string;
  activity_level: number;
  admin_fee?: number | null;
  Auction_Image?: (string & DirectusFiles) | null;
  auction_type?: string | null;
  Codes?: unknown | null;
  commission?: number | null;
  current_lot?: (string & Lots) | null;
  current_lot_end_time?: string | null;
  date_created?: string | null;
  date_updated?: string | null;
  description?: string | null;
  end_date?: string | null;
  id: number;
  inactivity_periods: number;
  last_activity_time?: string | null;
  location?: string | null;
  lots: any[] & Lots[];
  next_lot_start_time?: string | null;
  pb_auction_state_id?: string | null;
  recent_bid_timestamps?: string | null;
  start_date?: string;
  status?: string | null;
  title?: string | null;
  user_created?: (string & DirectusUsers) | null;
  VAT?: number | null;
};

export type Bids = {
  amount?: number | null;
  date_created?: string | null;
  id: string;
  lot?: (string & Lots) | null;
  proxy_bid?: boolean | null;
  user?: (string & DirectusUsers) | null;
};

export type BidsLots = {
  Bids_id?: string | null;
  id: number;
  lots_id?: string | null;
};

export type Categories = {
  description?: string | null;
  id: number;
  name?: string | null;
};

export type DirectusAccess = {
  id: string;
  policy: string & DirectusPolicies;
  role?: (string & DirectusRoles) | null;
  sort?: number | null;
  user?: (string & DirectusUsers) | null;
};

export type DirectusActivity = {
  action: string;
  collection: string;
  id: number;
  ip?: string | null;
  item: string;
  origin?: string | null;
  revisions: any[] & DirectusRevisions[];
  timestamp: string;
  user?: (string & DirectusUsers) | null;
  user_agent?: string | null;
};

export type DirectusCollections = {
  accountability?: string | null;
  archive_app_filter: boolean;
  archive_field?: string | null;
  archive_value?: string | null;
  collapse: string;
  collection: string;
  color?: string | null;
  display_template?: string | null;
  group?: (string & DirectusCollections) | null;
  hidden: boolean;
  icon?: string | null;
  item_duplication_fields?: unknown | null;
  note?: string | null;
  preview_url?: string | null;
  singleton: boolean;
  sort?: number | null;
  sort_field?: string | null;
  translations?: unknown | null;
  unarchive_value?: string | null;
  versioning: boolean;
};

export type DirectusComments = {
  collection: string & DirectusCollections;
  comment: string;
  date_created?: string | null;
  date_updated?: string | null;
  id: string;
  item: string;
  user_created?: (string & DirectusUsers) | null;
  user_updated?: (string & DirectusUsers) | null;
};

export type DirectusDashboards = {
  color?: string | null;
  date_created?: string | null;
  icon: string;
  id: string;
  name: string;
  note?: string | null;
  panels: any[] & DirectusPanels[];
  user_created?: (string & DirectusUsers) | null;
};

export type DirectusExtensions = {
  bundle?: string | null;
  enabled: boolean;
  folder: string;
  id: string;
  source: string;
};

export type DirectusFields = {
  collection: string & DirectusCollections;
  conditions?: unknown | null;
  display?: string | null;
  display_options?: unknown | null;
  field: string;
  group?: (string & DirectusFields) | null;
  hidden: boolean;
  id: number;
  interface?: string | null;
  note?: string | null;
  options?: unknown | null;
  readonly: boolean;
  required?: boolean | null;
  sort?: number | null;
  special?: unknown | null;
  translations?: unknown | null;
  validation?: unknown | null;
  validation_message?: string | null;
  width?: string | null;
};

export type DirectusFiles = {
  charset?: string | null;
  created_on: string;
  description?: string | null;
  duration?: number | null;
  embed?: string | null;
  filename_disk?: string | null;
  filename_download: string;
  filesize?: number | null;
  focal_point_x?: number | null;
  focal_point_y?: number | null;
  folder?: (string & DirectusFolders) | null;
  height?: number | null;
  id: string;
  location?: string | null;
  metadata?: unknown | null;
  modified_by?: (string & DirectusUsers) | null;
  modified_on: string;
  storage: string;
  tags?: unknown | null;
  title?: string | null;
  tus_data?: unknown | null;
  tus_id?: string | null;
  type?: string | null;
  uploaded_by?: (string & DirectusUsers) | null;
  uploaded_on?: string | null;
  width?: number | null;
};

export type DirectusFlows = {
  accountability?: string | null;
  color?: string | null;
  date_created?: string | null;
  description?: string | null;
  icon?: string | null;
  id: string;
  name: string;
  operation?: (string & DirectusOperations) | null;
  operations: any[] & DirectusOperations[];
  options?: unknown | null;
  status: string;
  trigger?: string | null;
  user_created?: (string & DirectusUsers) | null;
};

export type DirectusFolders = {
  id: string;
  name: string;
  parent?: (string & DirectusFolders) | null;
};

export type DirectusMigrations = {
  name: string;
  timestamp?: string | null;
  version: string;
};

export type DirectusNotifications = {
  collection?: string | null;
  id: number;
  item?: string | null;
  message?: string | null;
  recipient: string & DirectusUsers;
  sender?: (string & DirectusUsers) | null;
  status?: string | null;
  subject: string;
  timestamp?: string | null;
};

export type DirectusOperations = {
  date_created?: string | null;
  flow: string & DirectusFlows;
  id: string;
  key: string;
  name?: string | null;
  options?: unknown | null;
  position_x: number;
  position_y: number;
  reject?: (string & DirectusOperations) | null;
  resolve?: (string & DirectusOperations) | null;
  type: string;
  user_created?: (string & DirectusUsers) | null;
};

export type DirectusPanels = {
  color?: string | null;
  dashboard: string & DirectusDashboards;
  date_created?: string | null;
  height: number;
  icon?: string | null;
  id: string;
  name?: string | null;
  note?: string | null;
  options?: unknown | null;
  position_x: number;
  position_y: number;
  show_header: boolean;
  type: string;
  user_created?: (string & DirectusUsers) | null;
  width: number;
};

export type DirectusPermissions = {
  action: string;
  collection: string;
  fields?: unknown | null;
  id: number;
  permissions?: unknown | null;
  policy: string & DirectusPolicies;
  presets?: unknown | null;
  validation?: unknown | null;
};

export type DirectusPolicies = {
  admin_access: boolean;
  app_access: boolean;
  description?: string | null;
  enforce_tfa: boolean;
  icon: string;
  id: string;
  ip_access?: unknown | null;
  name: string;
  permissions: any[] & DirectusPermissions[];
  roles: any[] & DirectusAccess[];
  users: any[] & DirectusAccess[];
};

export type DirectusPresets = {
  bookmark?: string | null;
  collection?: string | null;
  color?: string | null;
  filter?: unknown | null;
  icon?: string | null;
  id: number;
  layout?: string | null;
  layout_options?: unknown | null;
  layout_query?: unknown | null;
  refresh_interval?: number | null;
  role?: (string & DirectusRoles) | null;
  search?: string | null;
  user?: (string & DirectusUsers) | null;
};

export type DirectusRelations = {
  id: number;
  junction_field?: string | null;
  many_collection: string;
  many_field: string;
  one_allowed_collections?: unknown | null;
  one_collection?: string | null;
  one_collection_field?: string | null;
  one_deselect_action: string;
  one_field?: string | null;
  sort_field?: string | null;
};

export type DirectusRevisions = {
  activity: number & DirectusActivity;
  collection: string;
  data?: unknown | null;
  delta?: unknown | null;
  id: number;
  item: string;
  parent?: (number & DirectusRevisions) | null;
  version?: (string & DirectusVersions) | null;
};

export type DirectusRoles = {
  children: any[] & DirectusRoles[];
  description?: string | null;
  icon: string;
  id: string;
  name: string;
  parent?: (string & DirectusRoles) | null;
  policies: any[] & DirectusAccess[];
  users: any[] & DirectusUsers[];
  users_group: string;
};

export type DirectusSessions = {
  expires: string;
  ip?: string | null;
  next_token?: string | null;
  origin?: string | null;
  share?: (string & DirectusShares) | null;
  token: string;
  user?: (string & DirectusUsers) | null;
  user_agent?: string | null;
};

export type DirectusSettings = {
  auth_login_attempts?: number | null;
  auth_password_policy?: string | null;
  basemaps?: unknown | null;
  custom_aspect_ratios?: unknown | null;
  custom_css?: string | null;
  default_appearance: string;
  default_language: string;
  default_theme_dark?: string | null;
  default_theme_light?: string | null;
  id: number;
  mapbox_key?: string | null;
  module_bar?: unknown | null;
  project_color: string;
  project_descriptor?: string | null;
  project_logo?: (string & DirectusFiles) | null;
  project_name: string;
  project_url?: string | null;
  public_background?: (string & DirectusFiles) | null;
  public_favicon?: (string & DirectusFiles) | null;
  public_foreground?: (string & DirectusFiles) | null;
  public_note?: string | null;
  public_registration: boolean;
  public_registration_email_filter?: unknown | null;
  public_registration_role?: (string & DirectusRoles) | null;
  public_registration_verify_email: boolean;
  report_bug_url?: string | null;
  report_error_url?: string | null;
  report_feature_url?: string | null;
  storage_asset_presets?: unknown | null;
  storage_asset_transform?: string | null;
  storage_default_folder?: (string & DirectusFolders) | null;
  theme_dark_overrides?: unknown | null;
  theme_light_overrides?: unknown | null;
  theming_group: string;
  visual_editor_urls?: unknown | null;
};

export type DirectusShares = {
  collection: string & DirectusCollections;
  date_created?: string | null;
  date_end?: string | null;
  date_start?: string | null;
  id: string;
  item: string;
  max_uses?: number | null;
  name?: string | null;
  password?: string | null;
  role?: (string & DirectusRoles) | null;
  times_used?: number | null;
  user_created?: (string & DirectusUsers) | null;
};

export type DirectusTranslations = {
  id: string;
  key: string;
  language: string;
  value: string;
};

export type DirectusUsers = {
  appearance?: string | null;
  appwrite_id?: string | null;
  auth_data?: unknown | null;
  avatar?: (string & DirectusFiles) | null;
  company_name?: string | null;
  contact_number?: string | null;
  description?: string | null;
  email?: string | null;
  email_notifications?: boolean | null;
  external_identifier?: string | null;
  first_name?: string | null;
  id: string;
  id_number?: string | null;
  language?: string | null;
  last_access?: string | null;
  last_name?: string | null;
  last_page?: string | null;
  location?: string | null;
  password?: string | null;
  policies: any[] & DirectusAccess[];
  provider: string;
  reg_number?: string | null;
  role?: (string & DirectusRoles) | null;
  status: string;
  tags?: unknown | null;
  tfa_secret?: string | null;
  theme_dark?: string | null;
  theme_dark_overrides?: unknown | null;
  theme_light?: string | null;
  theme_light_overrides?: unknown | null;
  title?: string | null;
  token?: string | null;
};

export type DirectusVersions = {
  collection: string & DirectusCollections;
  date_created?: string | null;
  date_updated?: string | null;
  delta?: unknown | null;
  hash?: string | null;
  id: string;
  item: string;
  key: string;
  name?: string | null;
  user_created?: (string & DirectusUsers) | null;
  user_updated?: (string & DirectusUsers) | null;
};

export type DirectusWebhooks = {
  actions: unknown;
  collections: unknown;
  data: boolean;
  headers?: unknown | null;
  id: number;
  method: string;
  migrated_flow?: (string & DirectusFlows) | null;
  name: string;
  status: string;
  url: string;
  was_active_before_deprecation: boolean;
};

export type FicaDocuments = {
  bank_confirmation_letter?: (string & DirectusFiles) | null;
  date_created?: string | null;
  date_updated?: string | null;
  id: number;
  id_document?: (string & DirectusFiles) | null;
  proof_of_residence?: (string & DirectusFiles) | null;
  status?: string | null;
  user_id?: (string & DirectusUsers) | null;
  user_updated?: (string & DirectusUsers) | null;
};

export type Lots = {
  appwrite_id?: string | null;
  asset_starts?: boolean | null;
  auction?: (number & Auctions) | null;
  auto_increment?: boolean | null;
  bids: any[] & Bids[];
  color?: string | null;
  concluded?: boolean | null;
  current_bid?: number | null;
  current_bidder?: (string & DirectusUsers) | null;
  date_created?: string | null;
  extension_time?: number | null;
  fuel_type?: string | null;
  id: string;
  increment_amount?: number | null;
  increment_higher?: string | null;
  increment_highest?: string | null;
  increment_low?: string | null;
  increment_lower?: string | null;
  increment_lowest?: string | null;
  increment_upper?: string | null;
  Increments: string;
  interior_images: any[] & LotsFiles2[];
  keys_available?: boolean | null;
  location?: string | null;
  lot_360_image_count?: number | null;
  lot_images: any[] & LotsFiles[];
  lot_status?: string | null;
  make?: string | null;
  mileage?: number | null;
  model?: string | null;
  reserve_price?: number | null;
  salvage_api_id?: string | null;
  starting_price?: number | null;
  STC?: boolean | null;
  StockType?: string | null;
  transmission?: string | null;
  vehicleCategory?: string | null;
  vehicleCode?: string | null;
  year?: string | null;
};

export type LotsFiles = {
  directus_files_id?: (string & DirectusFiles) | null;
  id: number;
  lots_id?: (string & Lots) | null;
};

export type LotsFiles1 = {
  directus_files_id?: (string & DirectusFiles) | null;
  id: number;
  lots_id?: (string & Lots) | null;
};

export type LotsFiles2 = {
  directus_files_id?: (string & DirectusFiles) | null;
  id: number;
  lots_id?: (string & Lots) | null;
};

export type Test = {
  id: number;
  test: any[] & TestFiles[];
};

export type TestFiles = {
  directus_files_id?: (string & DirectusFiles) | null;
  id: number;
  test_id?: (number & Test) | null;
};

export type CustomDirectusTypes = {
  auctions: Auctions[];
  Bids: Bids[];
  Bids_lots: BidsLots[];
  categories: Categories[];
  directus_access: DirectusAccess[];
  directus_activity: DirectusActivity[];
  directus_collections: DirectusCollections[];
  directus_comments: DirectusComments[];
  directus_dashboards: DirectusDashboards[];
  directus_extensions: DirectusExtensions[];
  directus_fields: DirectusFields[];
  directus_files: DirectusFiles[];
  directus_flows: DirectusFlows[];
  directus_folders: DirectusFolders[];
  directus_migrations: DirectusMigrations[];
  directus_notifications: DirectusNotifications[];
  directus_operations: DirectusOperations[];
  directus_panels: DirectusPanels[];
  directus_permissions: DirectusPermissions[];
  directus_policies: DirectusPolicies[];
  directus_presets: DirectusPresets[];
  directus_relations: DirectusRelations[];
  directus_revisions: DirectusRevisions[];
  directus_roles: DirectusRoles[];
  directus_sessions: DirectusSessions[];
  directus_settings: DirectusSettings;
  directus_shares: DirectusShares[];
  directus_translations: DirectusTranslations[];
  directus_users: DirectusUsers[];
  directus_versions: DirectusVersions[];
  directus_webhooks: DirectusWebhooks[];
  fica_documents: FicaDocuments[];
  lots: Lots[];
  lots_files: LotsFiles[];
  lots_files_1: LotsFiles1[];
  lots_files_2: LotsFiles2[];
  test: Test[];
  test_files: TestFiles[];
};
