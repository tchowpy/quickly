import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { MapPin, Phone, Navigation } from "lucide-react-native";
import { UserCardBase } from "./UserCardBase";

/* -------------------------------------------------------
COURIER CARD
--------------------------------------------------------*/
export function CourierCard({ user, onCall, onNavigate }: any) {
    return (
    <UserCardBase
        title="Livreur"
        user={user}
        distanceKm={user?.distance_km}
        eta={user?.eta}
        onCall={onCall}
        onNavigate={onNavigate}
    />
    );
}