import React from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { View } from "react-native";

export default function MapSection({
  order,
  provider,
  courier,
  clientPosition,
  routeCoords,
  mapRef,
}) {

    //console.log("Displaying courier marker at:", courier.latitude, courier.longitude);
  return (
    <View style={{ height: "50%" }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={{
            latitude: courier ? courier.latitude : order.latitude,
            longitude: courier ? courier.longitude : order.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        }}
      >
        {/* Livraison */}
        <Marker
          coordinate={{
            latitude: order.latitude,
            longitude: order.longitude,
          }}
          pinColor="#7B3FE4"
          title="Adresse de livraison"
        />

        {/* Client */}
        {clientPosition && <Marker coordinate={clientPosition} pinColor="green" />}

        {/* Fournisseur */}
        {provider && (
          <Marker
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            pinColor="yellow"
          />
        )}

        {/* Livreur */}
        {courier && (
          <Marker
            coordinate={{
              latitude: courier.latitude,
              longitude: courier.longitude,
            }}
            pinColor="red"
          />
        )}

        {/* Route */}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#7B3FE4" />
        )}
      </MapView>
    </View>
  );
}
