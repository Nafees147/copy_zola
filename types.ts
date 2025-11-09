export type ImageFile = {
  dataUrl: string;
  base64: string;
  mimeType: string;
} | null;

export interface User {
  id: string;
  email?: string;
  username: string;
  avatar?: string;
}

export interface GeneratedAsset {
  id: string; // uuid
  user_id: string;
  image_url: string; // This is the storage path
  display_url: string; // This is the signed URL or data URL for display
  source_feature: string;
  created_at: string; // ISO string
}

export interface CollectionAsset {
  id: string; // uuid
  user_id: string;
  image_url: string; // This is the storage path
  display_url: string; // This is the signed URL or data URL for display
  asset_type: 'individual' | 'composed';
  item_name: string;
  item_category: string;
  created_at: string; // ISO string
}

export type AssetViewType = 'Front' | 'Back' | 'Side' | 'Main';
export type AssetCategory = 'Upper Body' | 'Lower Body' | 'Footwear' | 'Accessories' | 'Full Outfit';

export interface GeneratedView {
  viewType: AssetViewType;
  imageBase64: string; // just the base64 data
}

export interface ExtractedAsset {
  category: AssetCategory;
  itemName: string;
  views: GeneratedView[];
}