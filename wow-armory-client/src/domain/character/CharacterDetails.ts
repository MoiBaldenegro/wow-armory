export interface CharacterMediaAsset {
  key: string;
  url: string;
}

export interface ItemStatLine {
  text: string;
  color?: string;
  negated?: boolean;
}

export interface ItemSetInfo {
  name: string;
  items: Array<{ name: string; equipped: boolean }>;
  effects: Array<{ text: string; active: boolean }>;
}

export interface CharacterEquipmentItem {
  slot: string;
  slotType?: string;
  name: string;
  itemId?: number;
  level?: number;
  quality?: string;
  /** `POOR`, `COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `LEGENDARY`... */
  qualityType?: string;
  iconUrl?: string;
  binding?: string;
  itemType?: string;
  inventoryType?: string;
  armor?: string;
  weapon?: { damage?: string; speed?: string; dps?: string };
  stats?: ItemStatLine[];
  enchantments?: string[];
  sockets?: string[];
  spells?: string[];
  set?: ItemSetInfo;
  requirements?: string[];
  durability?: string;
  description?: string;
}

export interface CharacterDetails {
  /** Full body render when available, otherwise the best media asset. */
  renderUrl?: string;
  media: CharacterMediaAsset[];
  equipment: CharacterEquipmentItem[];
}
