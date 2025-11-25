import polyline from "@mapbox/polyline";

const API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY;

export async function getRouteFromORS(from, to) {
  try {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: API_KEY,
        },
        body: JSON.stringify({
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
          // Le radius doit être ici, au root, pas dans options
          radiuses: [1000, 1000]
        }),
      }
    );

    const json = await response.json();
    console.log('getRouteFromORS -- json ',json)
    if (!json.routes) return [];

    const encoded = json.routes[0].geometry;
    const decoded = polyline.decode(encoded);
    console.log("ORS decoded:", decoded);
    return decoded.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch (e) {
    console.log("ORS error:", e);
    return [];
  }
}
