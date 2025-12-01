import React, {
  Children,
  ForwardedRef,
  ReactElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { LayoutChangeEvent, Platform, StyleSheet, View, ViewProps } from "react-native";
import { AppleMaps, CameraPosition, Coordinates, GoogleMaps } from "expo-maps";

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Region = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewRef = {
  animateToRegion: (nextRegion: Region, duration?: number) => void;
  animateCamera: (position: CameraPosition, options?: { duration?: number }) => void;
  setCameraPosition: (position: CameraPosition, options?: { duration?: number }) => void;
  pointForCoordinate: (coord: LatLng) => Promise<{ x: number; y: number }>;
};

type MapViewProps = Omit<ViewProps, "children"> & {
  region?: Region;
  initialRegion?: Region;
  children?: React.ReactNode;
  onRegionChangeComplete?: (region: Region) => void;
  pointerEvents?: "auto" | "none";
};

type MarkerProps = {
  coordinate: LatLng;
  title?: string;
  description?: string;
  identifier?: string;
  pinColor?: string;
};

type PolylineProps = {
  coordinates: LatLng[];
  strokeColor?: string;
  strokeWidth?: number;
  identifier?: string;
};

const MarkerComponent: React.FC<MarkerProps> = () => null;
MarkerComponent.displayName = "ExpoMapMarker";

const PolylineComponent: React.FC<PolylineProps> = () => null;
PolylineComponent.displayName = "ExpoMapPolyline";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const deltaToZoom = (delta: number) => {
  if (!delta) {
    return 16;
  }
  const zoom = Math.log2(360 / delta);
  return clamp(zoom, 0, 20);
};

const zoomToDelta = (zoom: number) => {
  const normalized = clamp(zoom, 0, 20);
  const delta = 360 / Math.pow(2, normalized);
  return Math.max(delta, 0.0001);
};

const cameraFromRegion = (region?: Region): CameraPosition | undefined => {
  if (!region) return undefined;
  return {
    coordinates: {
      latitude: region.latitude,
      longitude: region.longitude,
    },
    zoom: deltaToZoom(region.latitudeDelta),
  };
};

const regionFromCamera = (camera: { coordinates?: Coordinates; zoom?: number }, fallback?: Region): Region | undefined => {
  if (!camera.coordinates) {
    return fallback;
  }

  const zoom = camera.zoom ?? (fallback ? deltaToZoom(fallback.latitudeDelta) : 16);
  const latitudeDelta = zoomToDelta(zoom);
  const longitudeDelta = latitudeDelta; // Approximation

  return {
    latitude: camera.coordinates.latitude ?? fallback?.latitude ?? 0,
    longitude: camera.coordinates.longitude ?? fallback?.longitude ?? 0,
    latitudeDelta,
    longitudeDelta,
  };
};

const projectCoordinate = (coord: LatLng, region: Region, layout: { width: number; height: number }) => {
  const { width, height } = layout;
  const deltaLat = region.latitudeDelta || 0.0001;
  const deltaLng = region.longitudeDelta || 0.0001;

  const x = width / 2 + ((coord.longitude - region.longitude) / deltaLng) * (width / 2);
  const y = height / 2 - ((coord.latitude - region.latitude) / deltaLat) * (height / 2);

  return { x, y };
};

const mapStyle = StyleSheet.create({
  absolute: StyleSheet.absoluteFillObject,
});

const BaseMapComponent: React.ComponentType<any> = Platform.OS === "ios" ? AppleMaps.View : GoogleMaps.View;

function InternalMapView(props: MapViewProps, ref: ForwardedRef<MapViewRef>) {
  const {
    region,
    initialRegion,
    children,
    style,
    onRegionChangeComplete,
    onLayout,
    pointerEvents,
    ...restProps
  } = props;

  const mapRef = useRef<GoogleMaps.MapView | AppleMaps.MapView | null>(null);
  const lastLayout = useRef({ width: 0, height: 0 });
  const currentRegionRef = useRef<Region | undefined>(region ?? initialRegion);
  const initialRegionApplied = useRef(false);

  useEffect(() => {
    if (region) {
      currentRegionRef.current = region;
    }
  }, [region]);


  const markerElements = useMemo(
    () =>
      Children.toArray(children).filter((child): child is ReactElement<MarkerProps> => {
        return isValidElement(child) && child.type === MarkerComponent;
      }),
    [children]
  );

  const polylineElements = useMemo(
    () =>
      Children.toArray(children).filter((child): child is ReactElement<PolylineProps> => {
        return isValidElement(child) && child.type === PolylineComponent;
      }),
    [children]
  );

  const appleMarkers = useMemo(
    () =>
      markerElements.map((marker, index) => ({
        id: marker.props.identifier ?? marker.key?.toString() ?? `marker-${index}`,
        coordinates: marker.props.coordinate,
        title: marker.props.title,
        tintColor: marker.props.pinColor,
      })),
    [markerElements]
  );

  const googleMarkers = useMemo(
    () =>
      markerElements.map((marker, index) => ({
        id: marker.props.identifier ?? marker.key?.toString() ?? `marker-${index}`,
        coordinates: marker.props.coordinate,
        title: marker.props.title,
        snippet: marker.props.description,
      })),
    [markerElements]
  );

  const resolvedPolylines = useMemo(
    () =>
      polylineElements.map((polyline, index) => ({
        id: polyline.props.identifier ?? polyline.key?.toString() ?? `polyline-${index}`,
        coordinates: polyline.props.coordinates,
        color: polyline.props.strokeColor,
        width: polyline.props.strokeWidth,
      })),
    [polylineElements]
  );

  const applyCameraPosition = useCallback((position: CameraPosition, duration?: number) => {
    if (!mapRef.current) return;

    if (Platform.OS === "android") {
      (mapRef.current as GoogleMaps.MapView).setCameraPosition({
        ...position,
        duration,
      });
    } else {
      (mapRef.current as AppleMaps.MapView).setCameraPosition(position);
    }

    const derivedRegion = regionFromCamera(position, currentRegionRef.current);
    if (derivedRegion) {
      currentRegionRef.current = derivedRegion;
    }
  }, []);

  const animateToRegion = useCallback(
    (nextRegion: Region, duration = 500) => {
      const nextCamera = cameraFromRegion(nextRegion);
      if (!nextCamera) return;
      applyCameraPosition(nextCamera, duration);
    },
    [applyCameraPosition]
  );

  useEffect(() => {
    if (region) {
      currentRegionRef.current = region;
      if (initialRegionApplied.current) {
        animateToRegion(region, 0);
      } else {
        initialRegionApplied.current = true;
      }
      return;
    }

    if (!initialRegionApplied.current && initialRegion) {
      currentRegionRef.current = initialRegion;
      animateToRegion(initialRegion, 0);
      initialRegionApplied.current = true;
    }
  }, [region, initialRegion, animateToRegion]);

  useImperativeHandle(
    ref,
    (): MapViewRef => ({
      animateToRegion,
      animateCamera: (position, options) => {
        applyCameraPosition(position, options?.duration);
      },
      setCameraPosition: (position, options) => {
        applyCameraPosition(position, options?.duration);
      },
      pointForCoordinate: async (coord) => {
        if (!currentRegionRef.current || !lastLayout.current.width || !lastLayout.current.height) {
          throw new Error("Map layout not ready");
        }
        return projectCoordinate(coord, currentRegionRef.current, lastLayout.current);
      },
    }),
    [animateToRegion, applyCameraPosition]
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      lastLayout.current = { width, height };
      onLayout?.(event);
    },
    [onLayout]
  );

  const handleCameraMove = useCallback(
    (event: { coordinates: Coordinates; zoom: number }) => {
      const nextRegion = regionFromCamera(event, currentRegionRef.current);
      if (nextRegion) {
        currentRegionRef.current = nextRegion;
        onRegionChangeComplete?.(nextRegion);
      }
    },
    [onRegionChangeComplete]
  );

  const mapSpecificProps =
    Platform.OS === "ios"
      ? {
          markers: appleMarkers,
          polylines: resolvedPolylines,
        }
      : {
          markers: googleMarkers,
          polylines: resolvedPolylines,
        };

  return (
    <View {...restProps} style={style} onLayout={handleLayout}>
      <BaseMapComponent
        ref={mapRef}
        style={mapStyle.absolute}
        onCameraMove={handleCameraMove}
        cameraPosition={
          region
            ? cameraFromRegion(region)
            : initialRegion
            ? cameraFromRegion(initialRegion)
            : undefined
        }
        {...mapSpecificProps}
        pointerEvents={pointerEvents}
      />
    </View>
  );
}

const MapView = forwardRef<MapViewRef, MapViewProps>(InternalMapView);

export { MapView as default, MarkerComponent as Marker, PolylineComponent as Polyline };
