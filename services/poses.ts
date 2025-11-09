import { FEMALE_POSE_URLS } from './femalePoses';

export interface CampaignShotPreset {
  id: string;
  name: string;
  command: string; // Prompt Injection
  imageUrl: string;
}

export interface PresetCategory {
  id: 'action' | 'angle' | 'variation';
  name: string;
  description: string;
  presets: CampaignShotPreset[];
}

const OLD_PRESETS = [
  {
    category: { id: 'action', name: 'Action Poses', description: 'Sells attitude & lifestyle. At least one shot in your campaign must use an Action Pose.'},
    presets: [
      { id: 'relaxed_silhouette_1', name: 'Classic Full-Body Shot', command: 'Full body, hand-in-pocket, selling the fit and volume.', imageUrl: FEMALE_POSE_URLS['relaxed_silhouette_1'] },
      { id: 'mood_profile_1', name: 'Leaning Torso Pose', command: '3/4 view, intense gaze, hands near garment (collar/zipper).', imageUrl: FEMALE_POSE_URLS['mood_profile_1'] },
      { id: 'relaxed_silhouette_2', name: 'Crossed-Legs Standing with Arms Folded', command: 'Full body, casual standing pose, relaxed arms.', imageUrl: FEMALE_POSE_URLS['relaxed_silhouette_2'] },
      { id: 'mood_profile_2', name: 'Standing Side Profile (Looking Back)', command: 'Mid-shot, looking away from camera, conveying a thoughtful mood.', imageUrl: FEMALE_POSE_URLS['mood_profile_2'] },
      { id: 'relaxed_silhouette_3', name: 'Eyes-Closed/Looking Down Bust Shot', command: 'Full body, dynamic walking motion, creating natural fabric movement.', imageUrl: FEMALE_POSE_URLS['relaxed_silhouette_3'] },
      { id: 'mood_profile_3', name: 'Relaxed Hands-Down Full-Body', command: "Close-up profile shot, focusing on the model's expression and collar detail.", imageUrl: FEMALE_POSE_URLS['mood_profile_3'] },
    ]
  },
  {
    category: { id: 'angle', name: 'Angle Poses', description: 'Sells fit & construction. At least one shot in your campaign must use an Angle Pose.'},
    presets: [
      { id: 'back_fit_1', name: 'Rear View with Look-Back', command: '3/4 view from the back, showing shoulder fit and garment construction.', imageUrl: FEMALE_POSE_URLS['back_fit_1'] },
      { id: 'back_fit_2', name: 'Straight Standing Rear View', command: 'Direct rear view, highlighting the back details of the garment.', imageUrl: FEMALE_POSE_URLS['back_fit_2'] },
    ]
  },
  {
    category: { id: 'variation', name: 'Variation Poses', description: 'Sells detail & context. These shots add variety to your campaign.'},
    presets: [
      { id: 'texture_focus_1', name: 'Relaxed Side Profile (Forward Facing Head)', command: 'Extreme close-up on fabric texture and hardware.', imageUrl: FEMALE_POSE_URLS['texture_focus_1'] },
      { id: 'seated_casual_1', name: 'Casual Leaning Pose', command: 'Model sitting, relaxed pose, showing garment drape and accessories.', imageUrl: FEMALE_POSE_URLS['seated_casual_1'] },
    ]
  }
// FIX: Add 'as const' to ensure TypeScript infers the literal types for 'id' ('action', 'angle', 'variation')
// instead of widening it to a generic 'string'. This resolves the type error when mapping to PresetCategory[].
] as const;


export const FEMALE_PRESET_CATEGORIES: PresetCategory[] = OLD_PRESETS.map(data => ({
    id: data.category.id,
    name: data.category.name,
    description: data.category.description,
    presets: data.presets.map(p => ({
        id: p.id,
        name: p.name,
        command: p.command,
        imageUrl: p.imageUrl
    }))
}));

export const ALL_FEMALE_PRESETS: CampaignShotPreset[] = FEMALE_PRESET_CATEGORIES.flatMap(category => category.presets);