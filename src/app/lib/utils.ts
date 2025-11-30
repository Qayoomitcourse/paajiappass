import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- FIX: Replace 'any[]' with the 'ClassValue[]' type from clsx ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}