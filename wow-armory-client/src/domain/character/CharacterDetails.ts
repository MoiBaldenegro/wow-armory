export interface CharacterMediaAsset {
  key: string;
  url: string;
}

export interface CharacterEquipmentItem {
  slot: string;
  name: string;
  level?: number;
  quality?: string;
  iconUrl?: string;
}

export interface CharacterDetails {
  media: CharacterMediaAsset[];
  equipment: CharacterEquipmentItem[];
}
