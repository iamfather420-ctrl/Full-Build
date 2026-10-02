import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function shortHash(value: string, size = 10) {
  return `${value.slice(0, size)}…${value.slice(-6)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
