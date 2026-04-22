"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppSettings } from "@/features/types";

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  toggleSeasonMode: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  pricingTiers: [
    { name: "Standard", price: 5000 },
    { name: "Premium", price: 8000 },
  ],
  defaultBookingAmount: 1000,
  whatsappTemplates: [
    { id: "1", name: "Welcome", text: "Hi! Welcome to LOVE." },
    { id: "2", name: "Synopsis Ready", text: "Your synopsis is ready for review." },
    { id: "3", name: "Payment Reminder", text: "Friendly reminder for your pending payment." },
  ],
  webhookUrls: [],
  founderProfile: { name: "Founder", email: "founder@example.com", phone: "+1234567890" },
  seasonModeEnabled: false,
  commissionSlabs: [{ minLeads: 1, maxLeads: 5, percentage: 10 }],
  themePreferences: { primaryColor: "#000000", darkMode: true },
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll store settings in a single document `settings/global`
    const docRef = doc(db, "settings", "global");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ id: docSnap.id, ...docSnap.data() } as AppSettings);
      } else {
        // Initialize if not exists
        setDoc(docRef, defaultSettings).then(() => {
          setSettings(defaultSettings);
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    const docRef = doc(db, "settings", "global");
    await updateDoc(docRef, updates);
  };

  const toggleSeasonMode = async () => {
    if (!settings) return;
    await updateSettings({ seasonModeEnabled: !settings.seasonModeEnabled });
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, toggleSeasonMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
