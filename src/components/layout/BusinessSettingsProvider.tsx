"use client";

import { createContext, useContext } from "react";

export interface BusinessSettingsValue {
  companyName: string | null;
  slogan: string | null;
  address: string | null;
  logoUrl: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

const EMPTY_SETTINGS: BusinessSettingsValue = {
  companyName: null,
  slogan: null,
  address: null,
  logoUrl: null,
  bankName: null,
  bankAccountNumber: null,
  bankAccountHolder: null,
};

const BusinessSettingsContext = createContext<BusinessSettingsValue | null>(null);

export function BusinessSettingsProvider({
  value,
  children,
}: {
  value: BusinessSettingsValue;
  children: React.ReactNode;
}) {
  return (
    <BusinessSettingsContext.Provider value={value}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings(): BusinessSettingsValue {
  return useContext(BusinessSettingsContext) ?? EMPTY_SETTINGS;
}
