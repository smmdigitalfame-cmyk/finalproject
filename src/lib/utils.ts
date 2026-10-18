import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseInputNumber(value: string | number): number {
  if (typeof value === "number") return value;

  const lowerVal = value.toLowerCase().trim();
  if (!lowerVal) return 0;

  // Duration-like input (e.g. "1h 20m", "1:30", "45s")
  if (lowerVal.includes(":") || /\d\s*h\b/.test(lowerVal) || /\d\s*s\b/.test(lowerVal)) {
    return parseDuration(value);
  }

  // Normalize: strip commas / spaces / underscores, keep digits, dot, k/m/b suffix
  const clean = lowerVal.replace(/[,\s_]/g, "").replace(/[^0-9.kmb]/g, "");
  if (!clean) return 0;

  let multiplier = 1;
  if (clean.endsWith("b")) multiplier = 1_000_000_000;
  else if (clean.endsWith("m")) multiplier = 1_000_000;
  else if (clean.endsWith("k")) multiplier = 1_000;

  const numPart = clean.replace(/[kmb]/g, "");
  const parsed = parseFloat(numPart) * multiplier;
  return isNaN(parsed) ? 0 : parsed;
}

export function parseDuration(value: string): number {
  const hMatch = value.match(/(\d+)\s*h/i);
  const mMatch = value.match(/(\d+)\s*m/i);
  const sMatch = value.match(/(\d+)\s*s/i);
  const parts = value.split(':').filter(p => !isNaN(parseInt(p)));
  
  let h = 0, m = 0, s = 0;

  if (hMatch) h = parseInt(hMatch[1]);
  if (mMatch) m = parseInt(mMatch[1]);
  if (sMatch) s = parseInt(sMatch[1]);

  if (h === 0 && m === 0 && s === 0 && parts.length > 0) {
    if (parts.length === 3) {
      h = parseInt(parts[0]);
      m = parseInt(parts[1]);
      s = parseInt(parts[2]);
    } else if (parts.length === 2) {
      m = parseInt(parts[0]);
      s = parseInt(parts[1]);
    } else if (parts.length === 1) {
      s = parseInt(parts[0]);
    }
  }

  return (h * 3600) + (m * 60) + s;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  let res = "";
  if (h > 0) res += `${h}h:`;
  res += `${m.toString().padStart(2, '0')}m:`;
  res += `${s.toString().padStart(2, '0')}s`;
  return res;
}
