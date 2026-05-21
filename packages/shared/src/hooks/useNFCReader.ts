import { useState, useCallback } from "react";
import type { GateTagPayload } from "../types";

// NFC requires a physical device and expo-dev-client build.
// This hook provides the interface with a stub for Expo Go development.
// In production, swap in expo-nfc-module: NfcManager.start() / registerTagEvent().
export function useNFCReader() {
  const [reading, setReading] = useState(false);
  const [lastTag, setLastTag] = useState<GateTagPayload | null>(null);

  const startReading = useCallback(() => {
    setReading(true);
    // In dev builds with expo-nfc-module:
    // NfcManager.start();
    // NfcManager.registerTagEvent((tag) => { setLastTag(parsedTag); });
  }, []);

  const stopReading = useCallback(() => {
    setReading(false);
    // NfcManager.stop();
  }, []);

  return {
    reading,
    lastTag,
    setLastTag,
    startReading,
    stopReading,
  };
}
