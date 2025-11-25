import React from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { View } from "react-native";
import { OrderSummary, UserProfile } from "types/models";

// ==============================================================
// MAP SECTION COMPLETE (with smooth marker + dual routing)
// ==============================================================
export function FullMapSection(
{ 
    order, 
    engine, 
    mapRef 
}: { 
  order: OrderSummary;
  engine: {
    courier: any | null;
    provider: any | null,
    clientPos: any | null,
    courierRoute: any | null,
    providerRoute: any | null,
    getInterpolatedCourierPos: () => {latitude: number, longitude: number}  | null
}
  mapRef: any;
}) {
    const {
        courier,
        provider,
        clientPos,
        courierRoute,
        providerRoute,
    } = engine;

    const interpolatedCourierPosition =
  typeof engine.getInterpolatedCourierPos === "function"
    ? engine.getInterpolatedCourierPos() //?? courier
    : courier;
    // LOG  interpolatedCourierPosition  {"latitude": 5.3922641, "longitude": -3.9809511}
    //LOG  interpolatedCourierPosition  {"latitude": 5.3911436, "longitude": -3.9856983}
    console.log('interpolatedCourierPosition ',interpolatedCourierPosition)
    console.log('providerRoute ',providerRoute)
    return (
    <View style={{ height: "60%" }}>
    <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
            latitude: order.latitude,
            longitude: order.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        }}
    >
        {/* Adresse client */}
        <Marker
            coordinate={{ latitude: order.latitude, longitude: order.longitude }}
            pinColor="#7B3FE4"
            title="Adresse de livraison"
        />

        {/* Client GPS */}
        {clientPos && <Marker coordinate={clientPos} pinColor="green" />}

        {/* Provider route */}
        {order.status !== 'assigned' && providerRoute.length > 0 && (
            <Polyline coordinates={providerRoute} strokeWidth={4} strokeColor="#F8F5FF" />
        )}

        {/* Courier route */}
        {courierRoute.length > 0 && (
            <Polyline coordinates={courierRoute} strokeWidth={5} strokeColor="#b09ffc" />
        )}

        {/* Provider marker */}
        {provider && (
            <Marker
                coordinate={{ latitude: provider.latitude, longitude: provider.longitude }}
                pinColor="orange"
            />
        )}

        {/* Animated courier marker */}
        {interpolatedCourierPosition &&
        typeof interpolatedCourierPosition.latitude === "number" &&
        typeof interpolatedCourierPosition.longitude === "number" && (
        <Marker
            coordinate={interpolatedCourierPosition}
            pinColor="red"
            title="Livreur"
        />
        )}
    </MapView>
    </View>
    );
}