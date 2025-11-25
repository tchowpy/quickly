import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCatalogStore } from '../store/catalogStore';

export function useCatalog(autoLoad = true) {
  const {
    categories,
    subcategories,
    products,
    featuredProductIds,
    loading,
    setCategories,
    setSubcategories,
    setProducts,
    setFeatured,
    setLoading,
  } = useCatalogStore();

  useEffect(() => {
    if (!autoLoad || categories.length > 0 || loading) {
      return;
    }

    void refresh();
  }, [autoLoad, categories.length, loading]);

  const refresh = async () => {
    try {
      setLoading(true);
      const [{ data: categoryRows }, { data: productRows }, { data: featuredRows }] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('name'),
        supabase
          .from('products')
          //.select('id, name, description, price_regulated, subcategory_id, provider_id, is_suggested, image_url')
          .select('*'),
        supabase
          .from('products')
          .select('id')
          .eq('is_suggested', true)
          .limit(12),
      ]);

      if (categoryRows) {
        setCategories(categoryRows);
      }
      if (productRows) {
        setProducts(productRows);
      }
      if (featuredRows) {
        setFeatured(featuredRows.map((row) => row.id));
      }

      const { data: subRows } = await supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true);
      if (subRows) {
        setSubcategories(subRows);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    subcategories,
    products,
    featuredProductIds,
    loading,
    refresh,
  };
}
