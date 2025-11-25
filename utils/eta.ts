
export function computeETA(distanceKm: number) {
    const totalMinutes = distanceKm / 0.3;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return hours === 0 ? `${minutes}min`: `${hours}h ${minutes}min`;
}