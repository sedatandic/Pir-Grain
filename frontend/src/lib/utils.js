import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Istanbul timezone formatter (UTC+3)
export function toIstanbulTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}
