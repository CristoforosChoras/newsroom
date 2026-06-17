"use client";

import { useEffect } from "react";
import { useNewsroom } from "@/lib/store/useNewsroom";

/**
 * The store is created with `skipHydration: true` so the first client render
 * matches the server (default SEED). We rehydrate from localStorage once, after
 * mount, which then re-renders with any persisted state.
 */
export default function StoreHydration() {
  useEffect(() => {
    void useNewsroom.persist.rehydrate();
  }, []);
  return null;
}
