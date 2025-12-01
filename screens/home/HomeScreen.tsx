import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StatusBar,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { Bell, MapPin, UserRound } from 'lucide-react-native';

import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useCatalog } from '../../hooks/useCatalog';
import { useCatalogStore } from '../../store/catalogStore';
import { FeaturedProductCard } from '../../components/home/FeaturedProductCard';
import { CategoryPill } from '../../components/home/CategoryPill';
import { ActiveOrderCard } from '../../components/orders/ActiveOrderCard';
import { Card, CardPressable } from '../../components/ui/Card';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ProductGrid } from '../../components/home/ProductGrid';

import { QuickOrderModal } from '../../components/home/QuickOrderModal';
import { OrderTrackingModal } from '../../components/orders/OrderTrackingModal';

import { renderCategoryIcon, renderProductIcon } from '../../components/home/iconMappings';
import { Category, Product } from '../../types/models';
import { formatCurrency } from '../../utils/format';
import { getOrderMode } from 'utils/orderMode';
import { useOrders } from 'hooks/useOrders';
import { useOrderStore } from '../../store/orderStore';
import { HomeHeaderSlider } from 'components/home/HomeHeaderSlider';
import { SingleSelectModalFlexible } from 'components/ui/SingleSelectModalFlexible';
import { DeliveryTaskCardPro } from 'components/delivery/DeliveryTaskCardPro';
import { DeliveryTaskCardV2 } from 'components/delivery/DeliveryTaskCardV2';

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ProductSearchModalPremium from 'components/home/ProductSearchModalPremium';
import SearchBarBottom from 'components/home/SearchBarBottom';

import * as Location from "expo-location";
import { useAuthStore } from 'store/authStore';

export function HomeScreen({ navigation }: NativeStackScreenProps<MainStackParamList, 'Home'>) {

  // StatusBar
  StatusBar.setTranslucent(true);
  StatusBar.setBarStyle('light-content');
  StatusBar.setBackgroundColor('transparent');

  const { profile } = useSupabaseAuth();
  const { setGeoloc, geoloc} = useAuthStore();
  const { categories, products, featuredProductIds } = useCatalog(true);
  const { order: activeOrder } = useOrderStore((s) => s.active);
  const { history, trackingHistory } = useOrderStore((s) => s);
  const { uploadDeliveryProof, setCourierPos, deliveryAccept, deliveryReject, deliveryStatusUpdate, fetchOrders, fetchTrackings } = useOrders();

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [quickOrderVisible, setQuickOrderVisible] = useState(false);
  const [trackingVisible, setTrackingVisible] = useState(false);
  const [trackingListVisible, setTrackingListVisible] = useState(false);
  const [orderListVisible, setOrderListVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const subcategories = useCatalogStore((s) => s.subcategories);

  const activeOrders = useMemo(
      () => history.filter((o) => ['created', 'pending_broadcast','broadcasted','accepted', 'confirmed', 'in_preparation', 'assigned', 'in_delivery', 'delivered'].includes(o.status)),
      [history]
  );

  const activeTrackings = useMemo(
      () => trackingHistory.filter((t) => ['pending','assigned','retrieved','in_transit','at_destination'].includes(t.status)),
      [trackingHistory]
  );

  // -----------------------------------------
  // FILTERING LOGIC
  // -----------------------------------------

  const categoryToSubIds = useMemo(() => {
    const map = new Map<string, string[]>();
    subcategories.forEach((sub) => {
      if (!sub.category_id) return;
      const list = map.get(sub.category_id) ?? [];
      list.push(sub.id);
      map.set(sub.category_id, list);
    });
    return map;
  }, [subcategories]);

  const filteredProducts = useMemo(() => {
    if (!categoryFilter && !searchQuery) return products;

    let resultSearch = products;

    // Filtre catégorie
    if (categoryFilter) {
      const subs = categoryToSubIds.get(categoryFilter) ?? [];
      resultSearch = resultSearch.filter(
        (p) => p.subcategory_id && subs.includes(p.subcategory_id)
      );
    }

    // Filtre recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      resultSearch = resultSearch.filter((p) => {
        return (
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query))
        );
      });
    }

    console.log("filteredProducts - resultSearch ", resultSearch);
    return resultSearch;
  }, [products, categoryFilter, categoryToSubIds, searchQuery]);

  const featuredProducts = useMemo(
    () => products.filter((p) => featuredProductIds.includes(p.id)).slice(0, 8),
    [products, featuredProductIds]
  );

  const curatedProducts = useMemo(
    () => (filteredProducts.length ? filteredProducts : products).slice(0, 6),
    [filteredProducts, products]
  );

  const curatedProducts2 = useMemo(
    () => filteredProducts.length ? filteredProducts : products,
    [filteredProducts, products]
  );

  const topCategories = useMemo(() => categories.slice(0, 9), [categories]);

  const subcategoryById = useMemo(() => {
    const map = new Map();
    subcategories.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [subcategories]);

  // -----------------------------------------
  // AUTO REFRESH ORDERS
  // -----------------------------------------

    const handleSetCourierPos = (async() => {
      //console.log('handleSetCourierPos -- Ok')
      if (!profile?.id) return;
      

      let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
      
        const loc = await Location.getCurrentPositionAsync();
        setGeoloc(loc.coords)
        setCourierPos(
          profile?.id,
          loc.coords.latitude,
          loc.coords.longitude,
        );
        
    })

  useEffect(() => {
    const id = setInterval(() => {
      if (activeTrackings) handleSetCourierPos();
      fetchOrders();
      fetchTrackings();
    }, 10000);
    return () => clearInterval(id);
  }, []);

  /* Redirect if order active
  useEffect(() => {
    if (!activeOrder) return;
    const mode = getOrderMode(activeOrder.status);
    if (mode === 'search')
      return navigation.getParent()?.navigate('ProviderSearch', { orderId: activeOrder.id });
    if (mode === 'tracking')
      return navigation.getParent()?.navigate('OrderTracking', { orderId: activeOrder.id });
  }, [activeOrder]);
  */

  const handleDeliveryAccept = async (orderId: string, trackingId: string, courierId: string, latitude: number, longitude: number) => {
    setIsSubmitting(true)
    try {
      const {data, error} = await deliveryAccept(orderId, trackingId, courierId, latitude, longitude)
    
      if (error){
        Alert.alert("Erreur", error);
      }

    } catch (error) {
      
    } finally {
      setIsSubmitting(false)
    }
  };

  const handleDeliveryReject = async (orderId: string, trackingId: string, courierId: string, reason: string) => {
    setIsSubmitting(true)
    try {
      const {data, error} = await deliveryReject(orderId, trackingId, courierId, reason)
    console.log('data vaut: ', data)
      if (error){
        Alert.alert("Erreur", error);
      }
      
    } catch (error) {
      
    } finally {
      setIsSubmitting(false)
    }
  };

  const handleDeliveryStatusUpdate = async (orderId: string, trackingId: string, status: string, note: string, latitude?: number, longitude?: number, proof_file?: string) => {
    setIsSubmitting(true)
    try {
      let proofUrl = undefined;
      if (status === 'delivered' && proof_file ){
        // Uploader la preuve de livraison et récupérer l'URL
        proofUrl = await uploadDeliveryProof(orderId, proof_file, `preuve-${Date.now()}.jpg`);
        if (!proofUrl) {
          Alert.alert("Erreur", "Échec de l'upload de la preuve de livraison.");
          setIsSubmitting(false);
          return;
        }
      }

      const {data, error} = await deliveryStatusUpdate(orderId, trackingId, status, note, latitude, longitude, proofUrl)
    
      if (error){
        Alert.alert("Erreur", error);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false)
    }
  };
  // -----------------------------------------
  // HEADER FIXE (NON-SCROLLABLE)
  // -----------------------------------------

  const renderHeader = () => (
    <View className="rounded-b-3xl overflow-hidden backdrop-blur-md shadow-xl">
    <LinearGradient
      colors={['#7B3FE4', '#5F53E8', '#3FE47B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="px-5 pb-10 pt-10"
    >
      <View className="flex-row items-start justify-between">

        {/* TITLE + ADDRESS */}
        <View className="flex-1 pr-4">
          <Text className="mt-1 text-3xl font-semibold text-white">Quickly</Text>

          <View className="mt-4 flex-row items-center">
            <MapPin color="#fff" size={16} />
            <Text className="ml-2 text-sm text-white/80">
              {profile?.address ?? 'Position non définie'}
            </Text>
          </View>
        </View>

        {/* PROFILE + NOTIFICATIONS */}
        <View className="flex-row items-center gap-3">
          <IconButton icon={<Bell color="#1F1F1F" size={18} />} onPress={() => navigation.navigate('Notifications')} />
          <IconButton icon={<UserRound color="#1F1F1F" size={18} />} onPress={() => navigation.navigate('Profile')} />
        </View>
      </View>

      <HomeHeaderSlider
        hasOrders={false}
        hasDeliveries={false} // ou true si tu as un tracking de livraison
        onInstantOrder={() => setSearchModalVisible(true)}
        onOrdersPress={() => setOrderListVisible(true)}
        onDeliveriesPress={() => setTrackingListVisible(true)}
      />

    </LinearGradient>
    </View>
  );

  // -----------------------------------------
  // SCROLLABLE CONTENT
  // -----------------------------------------

  const scrollableData = [
    { type: 'active-order' },
    { type: 'categories' },
    //{ type: 'featured' },
    { type: 'grid' },
    //{ type: 'footer-buttons' },
    { type: 'search'}
  ];

  const renderScrollItem = ({ item }: any) => {
    switch (item.type) {

      case 'active-order':
        return (
          <View className="mt-4 px-3">
            {((activeOrders && activeOrders.length > 0) || (activeTrackings && activeTrackings.length > 0)) ? (
            <Card className="mx-3 flex-row justify-evenly items-center py-6 rounded-2xl bg-white shadow-sm">

              {/* --- Commandes --- */}
              { activeOrders && activeOrders.length > 0 && (
              <View className="items-center">
                <Text className="text-lg font-semibold text-[#7B3FE4]">
                  Commandes
                </Text>

                <CardPressable 
                className="mt-2 bg-white px-6 py-3 rounded-xl shadow-2xl"
                onPress={() => setOrderListVisible(true)}
                >
                  <Text className="text-5xl font-extrabold text-[#7B3FE4]">
                    {activeOrders.length}
                  </Text>
                </CardPressable>
              </View>
              )}

              {/* --- Livraisons --- */}
              { activeTrackings && activeTrackings.length > 0 && (
              <View className="items-center">
                <Text className="text-lg font-semibold text-[#3FE47B]">
                  Livraisons
                </Text>

                <CardPressable 
                className="mt-2 bg-white px-6 py-3 rounded-xl shadow-2xl"
                onPress={() => setTrackingListVisible(true)}
                >
                  <Text className="text-5xl font-extrabold text-[#3FE47B]">
                    {activeTrackings.length}
                  </Text>
                </CardPressable>
              </View>
              )}

            </Card>
              /*
              <Card className="bg-white/95">
                <ActiveOrderCard
                  order={activeOrder}
                  onPress={() => {
                    const mode = getOrderMode(activeOrder.status);
                    if (mode === 'search')
                      navigation.getParent()?.navigate('ProviderSearch', { orderId: activeOrder.id });
                    else
                      navigation.getParent()?.navigate('OrderTracking', { orderId: activeOrder.id });
                  }}
                />
              </Card>
              */
            ) : (
              <Card className="bg-white p-5">
                <Text className="text-lg font-semibold text-neutral-900">
                  Livraison express en 20 minutes
                </Text>
                <Text className="mt-2 text-sm text-neutral-500">
                  Produits locaux sélectionnés pour vous.
                </Text>
              </Card>
            )}
          </View>
        );

      case 'categories':
        return (
          <View className="mt-4 px-3">
            <FlatList
              data={topCategories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <CategoryPill
                  key={item.id}
                  category={item}
                  icon={renderCategoryIcon(item.name)}
                  active={categoryFilter === item.id}
                  onPress={(c) => setCategoryFilter((prev) => (prev === c.id ? null : c.id))}
                  className="mr-3"
                />
              )}
            />
          </View>
        );

      case 'featured':
        return (
          <View className="mt-4 px-3">
            {featuredProducts.map((product, index) => (
              <FeaturedProductCard
                key={product.id}
                product={product}
                icon={renderProductIcon(
                  subcategoryById.get(product.subcategory_id ?? '') ?? undefined
                )}
                onPress={() => navigation.navigate('Checkout', { productId: product.id })}
              />
            ))}
          </View>
        );

      case 'grid':
        return (
          <View className="px-3 mt-4">
            <ProductGrid
              products={curatedProducts}
              subcategoryById={subcategoryById}
              onPressProduct={(id) => navigation.navigate('Checkout', { productId: id })}
            />
          </View>
        );

      case 'footer-buttons':
        return (
          <View className="px-5 mt-6 space-y-3 pb-24">
            <PrimaryButton label="Commander rapidement" onPress={() => setQuickOrderVisible(true)} />
            <PrimaryButton
              label="Toujours pas trouvé ?"
              onPress={() => setSearchModalVisible(true)}
              gradient={['#EFEFEF', '#EFEFEF']}
              textClassName="text-neutral-700"
            />
          </View>
        );
      case 'search':
        return (
          products && products.length > 0 
          ? <SearchBarBottom onFocus={() => setSearchModalVisible(true)} /> 
          : null
        );
    }
  };

  // -----------------------------------------
  // RETURN — Header FIXE + FlatList scrollable
  // -----------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-[#F5F6FB]" edges={['left', 'right','bottom']}>

      {/* HEADER FIXE */}
      {renderHeader()}

      {/* SCROLLABLE CONTENT */}
      
      <FlatList
        data={scrollableData}
        keyExtractor={(item) => item.type}
        renderItem={renderScrollItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 10 }}
      />
      
      {/* MODALS */}
      <QuickOrderModal
        visible={quickOrderVisible}
        onClose={() => setQuickOrderVisible(false)}
        onConfirm={(id, qty) => navigation.navigate('Checkout', { productId: id, quantity: qty })}
      />

      <OrderTrackingModal visible={trackingVisible} onClose={() => setTrackingVisible(false)} />

      <SingleSelectModalFlexible
        visible={orderListVisible}
        title="Mes commandes actives"
        items={activeOrders}
        //horizontal
        selectedId={null}
        onSelect={(activeOrder) => {}}
        onClose={() => setOrderListVisible(false)}
        renderItem={(activeOrder, isSelected) => (
          <ActiveOrderCard
            key={activeOrder.id}
            order={activeOrder}
            onPress={(activeOrder) => {
          setOrderListVisible(false);
              if (getOrderMode(activeOrder.status) === 'search') {
                navigation.navigate('ProviderSearch', { orderId: activeOrder.id });
                return
              }
              if (getOrderMode(activeOrder.status) === 'tracking') {
                navigation.navigate('OrderTracking', { orderId: activeOrder.id });
                return
              }

              navigation.navigate('OrderDetails', { orderId: activeOrder.id })
        }}
          >
          </ActiveOrderCard>
        )}
      />

      <SingleSelectModalFlexible
        visible={trackingListVisible}
        title="Mes livraisons"
        items={activeTrackings}
        horizontal
        selectedId={null}
        onSelect={(activeTracking) => {}}
        onClose={() => setTrackingListVisible(false)}
        renderItem={(activeTracking, isSelected) => {
         //console.log("activeTracking.order.client: ", activeTracking.order.client);
          return <DeliveryTaskCardPro
            key={activeTracking.id}
            trackingInfos={activeTracking}
            onAccept={  (courierPos) => {
              handleDeliveryAccept(activeTracking.order.id, activeTracking.id.toString(),activeTracking.user.id, courierPos.latitude,courierPos.longitude);
            }}
            onReject={  (reason) => {

              handleDeliveryReject(activeTracking.order.id, activeTracking.id.toString(),activeTracking.user.id,reason ?? 'Demande de livraison rejetée');
            }}
            onRetrieved={ () => {
              handleDeliveryStatusUpdate(activeTracking.order.id, activeTracking.id.toString(),'retrieved','Commande récupérée');
            }}
            onInTransit={ () => {
              handleDeliveryStatusUpdate(activeTracking.order.id, activeTracking.id.toString(),'in_transit','En cours de livraison');
            }}
            onReachedDestination={ () => {
              handleDeliveryStatusUpdate(activeTracking.order.id, activeTracking.id.toString(),'at_destination','Le livreur est arrivé');
            }}
            onDelivered={  (proofUrl) => {
              handleDeliveryStatusUpdate(activeTracking.order.id, activeTracking.id.toString(),'delivered','Commande livrée',undefined,undefined,proofUrl);
            }}
            onFailed={  (note) => {
              handleDeliveryStatusUpdate(activeTracking.order.id, activeTracking.id.toString(),'failed',note);
            }}

            //onTheMove={  (courierPos) => {
            //  setCourierPos(activeTracking.id.toString(), courierPos.latitude,courierPos.longitude)
            //}}
            
            //onPress={() => navigation.navigate("DeliveryDetails", { id })}
          >
          </DeliveryTaskCardPro>
        
        }}
      />

      <ProductSearchModalPremium
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        products={curatedProducts2}
        categories={categories}
        categoryFilter={categoryFilter}
        subcategoryById={subcategoryById}
        onSelectProduct={(id) => {
          setSearchModalVisible(false);
          navigation.navigate('Checkout', { productId: id });
        }}
        onSelectCategory={(id) => {
          //setSearchModalVisible(false);
          setCategoryFilter((prev) => (prev === id ? null : id));
        }}
      />

    </SafeAreaView>
  );
}


/*****************************************************
 * SUPPORT COMPONENTS
 *****************************************************/

function IconButton({ icon, onPress }: { icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      className="h-10 w-10 items-center justify-center rounded-full bg-white/90"
      onPress={onPress}
    >
      {icon}
    </Pressable>
  );
}


function ProductSearchModal({
  visible,
  onClose,
  query,
  onQueryChange,
  products,
  categories,
  categoryFilter,
  subcategoryById,
  onSelectProduct,
  onSelectCategory,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  products: Product[];
  categories: Category[];
  categoryFilter: string | null;
  subcategoryById: Map<string, string>;
  onSelectProduct: (productId: string) => void;
  onSelectCategory: (categoryId: string) => void;
}) {
return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      navigationBarTranslucent
    >
      {/* Touche en dehors --> fermer */}
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View className="flex-1 bg-black/30" />
      </TouchableWithoutFeedback>

      <View className="absolute inset-x-0 bottom-0 h-[90%] rounded-t-3xl bg-white shadow-xl" style={{paddingBottom:50}}>
        <KeyboardAwareScrollView
          enableOnAndroid
          extraScrollHeight={80}  
          keyboardOpeningTime={0}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        >
          
          {/* Titre */}
          <Text className="text-lg font-semibold text-neutral-900">
            Que voulez-vous commander ?
          </Text>

          {/* Champ de recherche */}
          <TextInput
            placeholder="Rechercher un produit"
            placeholderTextColor="#9CA3AF"
            className="mt-4 rounded-2xl border border-neutral-200 px-4 py-3 text-base"
            value={query}
            onChangeText={onQueryChange}
          />

          {/* Catégories */}
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingVertical: 12 }}
            renderItem={({ item }) => (
              <CategoryPill
                category={item}
                icon={renderCategoryIcon(item.name)}
                active={categoryFilter === item.id}
                className="mr-3"
                onPress={() => onSelectCategory(item.id)}
              />
            )}
          />

          {/* Liste produits */}
          <View className="mt-2">
            <FlatList
              data={products}
              keyExtractor={(p) => p.id}
              numColumns={3}
              scrollEnabled={false}  // important !!
              columnWrapperStyle={{
                justifyContent:
                  products.length >= 3 ? 'space-between' :
                  products.length === 2 ? 'space-around' : 'center',
                marginBottom: 14,
              }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelectProduct(item.id)}
                  className="bg-[#F9FAFB] rounded-3xl p-3 items-center"
                  style={{ width: '31%' }}
                >
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-white mb-3">
                    {renderProductIcon(
                      subcategoryById.get(item.subcategory_id ?? '') ?? undefined,
                      '#7B3FE4'
                    )}
                  </View>

                  <Text className="text-sm font-semibold text-neutral-900 text-center" numberOfLines={2}>
                    {item.name}
                  </Text>

                  <Text className="mt-1 text-xs font-semibold text-[#7B3FE4]">
                    {formatCurrency(item.price_regulated ?? item.base_price ?? 0)}
                  </Text>
                </Pressable>
              )}
            />
          </View>

        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}
