import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { PrimaryButton } from "../ui/PrimaryButton";

import Svg, { Defs, LinearGradient, Stop, Path, Circle } from "react-native-svg";
import { useAuthStore } from "store/authStore";

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY || "";

// ---------------------------------------------------------------
// PIN QUICKLY (VIOLET → VERT)
// ---------------------------------------------------------------
type PinSVGProps = {
  scale: Animated.Value;
};

const PinSVG = ({ scale }: PinSVGProps) => (
  <Animated.View style={{ transform: [{ scale }] }}>
    <Svg width={52} height={52} viewBox="0 0 52 52">
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7B3FE4" />
          <Stop offset="1" stopColor="#3FE47B" />
        </LinearGradient>
      </Defs>

      <Path
        d="M26 2C16 2 8 10 8 20c0 10 10 22 18 30 8-8 18-20 18-30 0-10-8-18-18-18z"
        fill="url(#grad)"
      />

      <Circle cx="26" cy="20" r="6" fill="#fff" />
    </Svg>
  </Animated.View>
);

// ---------------------------------------------------------------
// BLUE DOT — POSITION ACTUELLE DU CLIENT
// ---------------------------------------------------------------
const BlueDot = () => (
  <View style={{ alignItems: "center", justifyContent: "center" }}>
    {/* Halo */}
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(66,133,244,0.25)",
        position: "absolute",
      }}
    />
    {/* Dot */}
    <View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: "#4285F4",
        borderWidth: 3,
        borderColor: "white",
      }}
    />
  </View>
);

// ---------------------------------------------------------------
type Props = {
  visible: boolean;
  onClose: () => void;
  onValidate: (data: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialLatitude?: number;
  initialLongitude?: number;
  initialAddress?: string;
};
// ---------------------------------------------------------------

export default function DeliveryAddressModal({
  visible,
  onClose,
  onValidate,
  initialLatitude,
  initialLongitude,
  initialAddress,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const { geoloc } = useAuthStore();

  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");

  const currentLocation = geoloc;

  const [mapDelta, setMapDelta] = useState(0.01);
  const [hasFocus, setHasFocus] = useState(false);

  // PIN ANIMATION
  const pinScale = useRef(new Animated.Value(1)).current;

  const animatePin = () => {
    pinScale.setValue(0.8);
    Animated.spring(pinScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  // ---------------------------------------------------------------
  // INITIALISATION
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!visible) return;

    setHasFocus(false);

    // Position initiale
    setTimeout(async () => {
      // 1. Position de livraison par défaut
      if (initialLatitude && initialLongitude) {
        const region = {
          latitude: initialLatitude,
          longitude: initialLongitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setSelectedLocation(region);
        setSelectedAddress(initialAddress ?? "");
        setSearch(initialAddress ?? "");

        mapRef.current?.animateToRegion(region, 300);
      }

      // 2. Position actuelle (blue dot)

    }, 200);
  }, [visible]);

  // ---------------------------------------------------------------
  // AUTOCOMPLÉTION INTELLIGENTE
  // ---------------------------------------------------------------
  const fetchSuggestions = async (text: string) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoadingList(true);

      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        text
      )}&apiKey=${GEOAPIFY_KEY}&format=json`;

      const res = await fetch(url);
      const json = await res.json();

      setSuggestions(json.results ?? []);
    } catch (e) {
      console.log("Autocomplete error:", e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!hasFocus) return;
    if (!search) {
      setSuggestions([]);
      return;
    }

    if (search.trim() === selectedAddress.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => fetchSuggestions(search), 350);
    return () => clearTimeout(timer);
  }, [search, hasFocus]);

  const applySuggestion = (item: any) => {
    const { lat, lon, formatted } = item;

    setHasFocus(false);
    setSuggestions([]);

    setSelectedLocation({ latitude: lat, longitude: lon });
    setSelectedAddress(formatted);
    setSearch(formatted);

    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lon,
        latitudeDelta: mapDelta,
        longitudeDelta: mapDelta,
      },
      300
    );

    animatePin();
  };

  // ---------------------------------------------------------------
  // REVERSE GEOCODING
  // ---------------------------------------------------------------
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });

      if (result?.length) {
        const r = result[0];
        const formatted = `${r.name ?? ""} ${r.street ?? ""}, ${r.city ?? ""}, ${r.region ?? ""}`.trim();

        setSelectedAddress(formatted);

        if (!hasFocus) setSearch(formatted);
      }
    } catch (e) {
      console.log("Reverse geocode error:", e);
    }
  };

  // ---------------------------------------------------------------
  // MOUVEMENT DE LA CARTE
  // ---------------------------------------------------------------
  const onRegionChangeComplete = (region: Region) => {
    const { latitude, longitude } = region;

    setSelectedLocation({ latitude, longitude });
    reverseGeocode(latitude, longitude);
    animatePin();
  };

  // ---------------------------------------------------------------
  // CONTROLS CARTE
  // ---------------------------------------------------------------
  const goToMyLocation = async () => {
    try {
      //setCurrentLocation({ latitude, longitude });

      mapRef.current?.animateToRegion(
        {
          latitude: geoloc?.latitude?? 0,
          longitude: geoloc?.longitude ?? 0,
          latitudeDelta: mapDelta,
          longitudeDelta: mapDelta,
        },
        300
      );

      animatePin();
    } catch (e) {
      console.log("GPS error", e);
    }
  };

  const centerOnSelected = () => {
    if (!selectedLocation) return;

    mapRef.current?.animateToRegion(
      {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: mapDelta,
        longitudeDelta: mapDelta,
      },
      300
    );

    animatePin();
  };

  const zoomIn = () => {
    const nd = Math.max(mapDelta * 0.6, 0.0008);
    setMapDelta(nd);
    centerOnSelected();
  };

  const zoomOut = () => {
    const nd = Math.min(mapDelta * 1.4, 0.3);
    setMapDelta(nd);
    centerOnSelected();
  };

  // ---------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------
  const validate = () => {
    if (!selectedLocation) return;
console.log('Selected location:', selectedLocation, selectedAddress);
    onValidate({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: selectedAddress,
    });

    onClose();
  };

  const close = () => {
    onClose();
  }
  // ---------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------
  return (
    <Modal visible={visible} animationType="slide" transparent navigationBarTranslucent={true} statusBarTranslucent={false}>
      <TouchableWithoutFeedback
        onPress={() => {
          setHasFocus(false);
          Keyboard.dismiss();
          setSuggestions([]);
        }}
      >
        <View className="flex-1 bg-black/20 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8 max-h-[95%]">

            <Text className="text-xl font-semibold text-neutral-900 mb-4">
              Sélectionner l'adresse de livraison
            </Text>

            {/* SEARCH FIELD */}
            <View style={{ position: "relative", zIndex: 9999 }}>
              <View
                style={{
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: suggestions.length > 0 ? 16 : 16,
                  borderBottomLeftRadius: suggestions.length > 0 ? 0 : 16,
                  borderBottomRightRadius: suggestions.length > 0 ? 0 : 16,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TextInput
                  placeholder="Rechercher une adresse…"
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onFocus={() => setHasFocus(true)}
                  onChangeText={(txt) => {
                    setSearch(txt);
                    setHasFocus(true);
                  }}
                  className="flex-1 text-base text-neutral-800"
                />

                {search.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setSearch("");
                      setSuggestions([]);
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>❌</Text>
                  </Pressable>
                )}
              </View>

              {suggestions.length > 0 && hasFocus && (
                <View
                  style={{
                    position: "absolute",
                    top: 54,
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    borderWidth: 1,
                    borderTopWidth: 0,
                    borderColor: "#E5E7EB",
                    maxHeight: 260,
                    overflow: "hidden",
                  }}
                >
                  <ScrollView keyboardShouldPersistTaps="always">
                    {loadingList && (
                      <View className="p-3">
                        <ActivityIndicator />
                      </View>
                    )}

                    {suggestions.map((item) => (
                      <Pressable
                        key={item.place_id}
                        className="p-3 border-b border-neutral-100"
                        onPress={() => applySuggestion(item)}
                      >
                        <Text className="text-neutral-800">{item.formatted}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* MAP */}
            <View
              style={{
                marginTop: 18,
                height: 420,
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                onRegionChangeComplete={onRegionChangeComplete}
                pointerEvents={suggestions.length > 0 && hasFocus ? "none" : "auto"}
                initialRegion={{
                  latitude: initialLatitude ?? 5.345317,
                  longitude: initialLongitude ?? -4.024429,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {/* BLUE DOT = Position actuelle du client */}
                {currentLocation && (
                  <Marker
                    coordinate={currentLocation}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <BlueDot />
                  </Marker>
                )}
              </MapView>

              {/* PIN QUICKLY FIXE AU CENTRE */}
              <View
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: [{ translateX: -26 }, { translateY: -52 }],
                }}
              >
                <PinSVG scale={pinScale} />
              </View>

              {/* MAP CONTROLS */}
              <View
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 12,
                  gap: 12,
                }}
              >
                <Pressable onPress={goToMyLocation} style={btn}>
                  <Text style={{ fontSize: 20 }}>🧭</Text>
                </Pressable>

                <Pressable onPress={centerOnSelected} style={btn}>
                  <Text style={{ fontSize: 20 }}>🎯</Text>
                </Pressable>

                <Pressable onPress={zoomIn} style={btn}>
                  <Text style={{ fontSize: 22 }}>+</Text>
                </Pressable>

                <Pressable onPress={zoomOut} style={btn}>
                  <Text style={{ fontSize: 22 }}>−</Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-6">
              <PrimaryButton label="Valider cette adresse" onPress={validate} />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const btn = {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: "white",
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 4,
};
