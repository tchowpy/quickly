export function formatCurrency(value: number | null | undefined, suffix = 'FCFA'): string {
  if (value == null || Number.isNaN(value)) {
    return '--';
  }
  return `${Number(value).toLocaleString('fr-FR')} ${suffix}`;
}

export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm == null) {
    return '--';
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}