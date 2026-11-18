import type { CharacterModelId } from '../types/namaz';

export interface CharacterModelOption {
  id: CharacterModelId;
  name: string;
  subtitle: string;
  previewImage?: string;
}

export const CHARACTER_MODELS: CharacterModelOption[] = [
  {
    id: 'embroidered_thobe',
    name: 'White Thobe & Kufi',
    subtitle: 'Embroidered gold-beige stole, placket & kufi cap',
    previewImage: '/assets/aistudio/IMG_9426c544-b1ed-496d-a88e-00c62c0d5b61_b39fae39.webp',
  },
  {
    id: 'gulf_ghutra',
    name: 'White Thobe & Ghutra',
    subtitle: 'Flowing white ghutra headscarf & flared sleeves',
    previewImage: '/assets/aistudio/IMG_0b8e4cf6-3bce-4d3c-bdd8-6dec656b4d51_41441755.png',
  },
  {
    id: 'classic_emerald',
    name: 'Classic Emerald Jubbah',
    subtitle: 'Cream thobe with emerald trim & kufi cap',
  },
];
