import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy", { locale: id });
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd");
}

export function formatRupiah(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("id-ID").format(n);
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function decimalToNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return parseFloat(String(val));
}

export function generateCSV(headers: string[], rows: string[][]): string {
  const csvRows = [headers.join(","), ...rows.map((r) => r.join(","))];
  return csvRows.join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
