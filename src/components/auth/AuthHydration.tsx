"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/useAuth";

/**
 * The auth store is created with `skipHydration: true` (like useNewsroom), so the
 * first client render matches the server (logged-out). We rehydrate from
 * localStorage once after mount, which re-renders with the persisted session.
 * Mounted high in the tree so it runs for both the app and login route groups.
 */
export default function AuthHydration() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);
  return null;
}
