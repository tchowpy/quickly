import React from 'react';
import type { LucideProps } from 'lucide-react-native';
import {
  Apple,
  Bath,
  CupSoda,
  Droplet,
  Milk,
  ShoppingBasket,
  Sparkles,
  SprayCan,
} from 'lucide-react-native';

const categoryIconMap: Record<string, React.ComponentType<LucideProps>> = {
  'Alimentation': ShoppingBasket,
  'Boissons': CupSoda,
  'Hygiène & Entretien': Sparkles,
  'Fruits & Légumes': Apple,
  'Produits Laitiers': Milk,
  'Jus & Sodas': CupSoda,
  'Eaux & Boissons chaudes': Droplet,
  'Hygiène personnelle': Bath,
  'Entretien maison': SprayCan,
};

const subcategoryIconFallbackMap: Record<string, React.ComponentType<LucideProps>> = {
  'Fruits & Légumes': Apple,
  'Produits Laitiers': Milk,
  'Jus & Sodas': CupSoda,
  'Eaux & Boissons chaudes': Droplet,
  'Hygiène personnelle': Bath,
  'Entretien maison': SprayCan,
};

export function renderCategoryIcon(name: string, color = '#7B3FE4'): React.ReactNode {
  const IconComponent = categoryIconMap[name] ?? ShoppingBasket;
  return <IconComponent size={18} color={color} />;
}

export function renderProductIcon(subcategoryName?: string | null, color = '#7B3FE4'): React.ReactNode {
  if (!subcategoryName) {
    return <ShoppingBasket size={18} color={color} />;
  }
  const IconComponent = subcategoryIconFallbackMap[subcategoryName] ?? ShoppingBasket;
  return <IconComponent size={18} color={color} />;
}
