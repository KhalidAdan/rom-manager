import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function isActiveBorrow(voucher: any): boolean {
  if (!voucher) return false;

  try {
    let returnedAt = voucher.returnedAt ? new Date(voucher.returnedAt) : null;
    let expiresAt = new Date(voucher.expiresAt);
    let now = new Date();

    return !returnedAt && expiresAt > now;
  } catch (error) {
    console.error("Date parsing error:", error);
    return false;
  }
}
