import React , {useEffect} from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, StatusBar } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList, RootStackParamList } from "../../navigation/types";
import { useOrderTrackingController } from "hooks/useOrderTrackingController";
import MapSection from "components/orders/MapSection";
import BottomSheetContent from "components/orders/BottomSheetContent";
import { FullMapSection } from "components/orders/FullMapSection";
import { getOrderMode } from "utils/orderMode";
import LoadingQuickLy from "components/ui/Loading";

export function OrderTrackingScreen({
  navigation,
  route,
}: NativeStackScreenProps<MainStackParamList, "OrderTracking">) {
  const { orderId } = route.params;

  const {
    order,
    provider,
    courier,
    clientPosition,
    //routeCoords,
    courierRoute,
    providerRoute,
    getInterpolatedCourierPos,
    mapRef,
    onCall,
    onNavigate,
    confirmReception,
  } = useOrderTrackingController(orderId);

  useEffect(() => {
    if (!order) return 
    if ( getOrderMode(order.status) === 'finished'){
      navigation.replace("OrderDetails", { orderId: order.id });
    }
  }, [order?.status]);

  if (!order || getOrderMode(order.status) !== 'tracking') {
    return (
      <LoadingQuickLy/>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right', 'bottom']}>
      <FullMapSection
        order={order}
        engine={{
          courier,
          provider,
          clientPos:clientPosition,
          courierRoute,
          providerRoute,
          getInterpolatedCourierPos
        }}
        //routeCoords={routeCoords}
        mapRef={mapRef}
      />

      <BottomSheetContent
        order={order}
        provider={provider}
        courier={courier}
        onCall={onCall}
        onNavigate={onNavigate}
        onConfirmReception={(orderId: string) => confirmReception(orderId)}
      />
    </SafeAreaView>
  );
}

