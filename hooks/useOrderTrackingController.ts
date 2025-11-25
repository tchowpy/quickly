import { useEffect, useRef, useState, useMemo } from "react";
import { throttle } from "lodash";
import haversine from "haversine-distance";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { Animated, Easing } from "react-native";
import { useOrderStore } from "store/orderStore";
import { useOrders } from "./useOrders";
import { useOrderRealtime } from "./useOrderRealtime";
import { getRouteFromORS } from "services/location/routeService";
import { computeETA } from "utils/eta";
import { useAuthStore } from "store/authStore";

export function useOrderTrackingController(orderId: string) {
  const { active, history } = useOrderStore();
  const { confirmReception } = useOrders();
  const { geoloc } = useAuthStore();

  // -------------------------------------------------------------------
  // ORDER
  // -------------------------------------------------------------------
  const order = useMemo(
    () =>
      active.order && active.order.id === orderId
        ? active.order
        : history.find((o) => o.id === orderId) ?? active.order,
    [active.order, history, orderId]
  );

  useOrderRealtime(order?.id);

  // -------------------------------------------------------------------
  // MAP refs
  // -------------------------------------------------------------------
  const mapRef = useRef(null);

  // -------------------------------------------------------------------
  // States
  // -------------------------------------------------------------------
  const [provider, setProvider] = useState(order?.provider);
  const [courier, setCourier] = useState({
    ...order?.courier, 
    latitude: order?.courier_latitude,
    longitude: order?.courier_longitude
  });

  const clientPosition = geoloc;

  const [courierRoute, setCourierRoute] = useState([]);
  const [providerRoute, setProviderRoute] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);

  // ================================================================
  // 🟣 INTERPOLATION DU MARQUEUR (DOIT ÊTRE AVANT LES EFFECTS)
  // ================================================================
  const previousPos = useRef(null);
  const currentPos = useRef(null);

  const animatedLat = useRef(new Animated.Value(0)).current;
  const animatedLng = useRef(new Animated.Value(0)).current;

  const animateTo = (from, to) => {
    previousPos.current = from;
    currentPos.current = to;

    Animated.timing(animatedLat, {
      toValue: 1,
      duration: 900,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => animatedLat.setValue(0));

    Animated.timing(animatedLng, {
      toValue: 1,
      duration: 900,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => animatedLng.setValue(0));
  };

  const getInterpolatedCourierPos = () => {
    if (!previousPos.current || !currentPos.current) {
      return currentPos.current;
    }
    console.log('getInterpolatedCourierPos -- previousPos: ', previousPos)
    console.log('getInterpolatedCourierPos -- currentPos: ', currentPos)
    const pos =  {
      latitude:
        previousPos.current.latitude +
        (currentPos.current.latitude - previousPos.current.latitude) *
          animatedLat.__getValue(),
      longitude:
        previousPos.current.longitude +
        (currentPos.current.longitude - previousPos.current.longitude) *
          animatedLng.__getValue(),
    };
    console.log('getInterpolatedCourierPos -- pos: ', pos)
    return pos;
  };

  // ================================================================
  // FOLLOW MODE
  // ================================================================
  const followCamera = useMemo(
    () =>
      throttle((coord) => {
        if (!mapRef.current) return;
        mapRef.current.animateCamera(
          { center: coord, zoom: 16 },
          { duration: 900 }
        );
      }, 2000),
    []
  );

  // ================================================================
  // PROVIDER ETA
  // ================================================================
  useEffect(() => {
    if (!order?.provider) return;

    const dist = haversine(
      {
        latitude: order.provider.latitude,
        longitude: order.provider.longitude,
      },
      { latitude: order.latitude, longitude: order.longitude }
    );

    const km = Number((dist / 1000).toFixed(2));

    setProvider({
      ...order.provider,
      distance_km: km,
      eta: computeETA(km),
    });
  }, [order?.provider]);

  // ================================================================
  // COURIER MOVEMENT + INTERPOLATION + ROUTING
  // ================================================================
  useEffect(() => {
    if (!order?.courier_latitude || !order?.courier_longitude) return;

    const newPos = {
      latitude: order.courier_latitude,
      longitude: order.courier_longitude,
    };

    if (courier?.latitude && courier?.longitude) {
      animateTo(
        { latitude: courier.latitude, longitude: courier.longitude },
        newPos
      );
    }

    const dist = haversine(newPos, {
      latitude: order.status === 'assigned'? provider?.latitude : order.latitude,
      longitude: order.status === 'assigned'? provider?.longitude : order.longitude,
    });

    const km = Number((dist / 1000).toFixed(2));
    const distKm = order.status === 'assigned' ? (km + Number(provider?.distance_km ?? 0)).toFixed(2) : km;

    setCourier({
      ...(courier ?? {}),
      latitude: newPos.latitude,
      longitude: newPos.longitude,
      distance_km: distKm,
      eta: computeETA(distKm),
    });

    followCamera(newPos);

    throttledRouteUpdate(
      { lat: newPos.latitude, lng: newPos.longitude },
      order.status === 'assigned' ? { lat: provider?.latitude, lng: provider?.longitude } : { lat: order.latitude, lng: order.longitude },
      setCourierRoute
    );
  }, [order?.courier_latitude, order?.courier_longitude, provider]);

  // ================================================================
  // PROVIDER ROUTE
  // ================================================================
  const throttledRouteUpdate = useMemo(
    () =>
      throttle((from, to, setter) => {
        getRouteFromORS(from, to).then(setter);
      }, 3000),
    []
  );

  useEffect(() => {
    if (!provider || !order) return;

    throttledRouteUpdate(
      { lat: provider.latitude, lng: provider.longitude },
      { lat: order.latitude, lng: order.longitude },
      setProviderRoute
    );
  }, [provider?.latitude, provider?.longitude, order?.latitude, order?.longitude]);

  // ================================================================
  // MANUAL ROUTING (BUTTON)
  // ================================================================
  const computeRoute = async (from, to, role ='client') => {
    //const route = await getRouteFromORS(from, to);
    throttledRouteUpdate(
      from,
      to,
      (role === 'client') ? setCourierRoute : setProviderRoute
    );
  };

  const onCall = (phone: string) => Linking.openURL(`tel:${phone}`);

  const onNavigate = async (user) => {
    await computeRoute(
      { lat: user.latitude, lng: user.longitude },
      { lat: geoloc?.latitude, lng: geoloc?.longitude },
      user.role
    )
  };

  return {
    order,
    provider,
    courier,
    clientPosition,
    courierRoute,
    providerRoute,
    getInterpolatedCourierPos,
    mapRef,
    onCall,
    onNavigate,
    confirmReception,
  };
}
