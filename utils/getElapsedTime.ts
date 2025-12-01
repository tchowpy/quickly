export function getElapsedTime(createdAt: string): string {
  if (!createdAt) return "";
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  let diff = Math.floor((now - created) / 1000); // en secondes

  const hours = Math.floor(diff / 3600);
  diff = diff % 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;

  let result = "";
  if (hours > 0) result += `${hours}h`;
  if (minutes > 0 || (hours > 0 && seconds > 0)) result += `${hours > 0 ? " " : ""}${minutes}m`;
  if (seconds > 0 && hours === 0) result += `${minutes > 0 ? " " : ""}${seconds}s`;

  return result.trim();
}