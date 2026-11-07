import { Character } from '../types/character';

export const mockCharacter: Character = {
  name: "Thrall",
  level: 70,
  class: "Shaman",
  race: "Orc",
  spec: "Enhancement",
  itemLevel: 447,
  avatar: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=400&fit=crop",
  bannerImage: "https://images.unsplash.com/photo-1624138784614-87fd1b6528f8?w=1920&h=600&fit=crop",
  stats: {
    strength: 856,
    agility: 945,
    intellect: 723,
    stamina: 912,
    criticalStrike: 22,
    haste: 18,
    mastery: 25,
    versatility: 15
  },
  guild: {
    name: "Guardians of Azeroth",
    rank: "Guild Master",
    memberCount: 156,
    realm: "Draenor"
  },
  recentAchievements: [
    {
      name: "Glory of the Dragonflight Hero",
      date: "2024-03-15",
      points: 50,
      description: "Complete the Dragonflight dungeon achievements listed below."
    },
    {
      name: "Dawn of the Infinite",
      date: "2024-03-10",
      points: 25,
      description: "Defeat Chrono-Lord Deios in the Dawn of the Infinite."
    },
    {
      name: "Defender of the Dream",
      date: "2024-03-05",
      points: 30,
      description: "Complete all quests in the Emerald Dream."
    }
  ],
  playTime: "1250 hours",
  lastLogin: "2024-03-20"
};