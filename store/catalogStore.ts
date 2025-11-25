import { create } from 'zustand';
import { Product, Category, Subcategory } from '../types/models';

interface CatalogState {
  categories: Category[];
  subcategories: Subcategory[];
  products: Product[];
  featuredProductIds: string[];
  loading: boolean;
  searchTerm: string;
  setCategories: (categories: Category[]) => void;
  setSubcategories: (subcategories: Subcategory[]) => void;
  setProducts: (products: Product[]) => void;
  setFeatured: (ids: string[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchTerm: (value: string) => void;
  reset: () => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  categories: [],
  subcategories: [],
  products: [],
  featuredProductIds: [],
  loading: false,
  searchTerm: '',
  setCategories: (categories) => set({ categories }),
  setSubcategories: (subcategories) => set({ subcategories }),
  setProducts: (products) => set({ products }),
  setFeatured: (featuredProductIds) => set({ featuredProductIds }),
  setLoading: (loading) => set({ loading }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  reset: () =>
    set({
      categories: [],
      subcategories: [],
      products: [],
      featuredProductIds: [],
      loading: false,
      searchTerm: '',
    }),
}));
