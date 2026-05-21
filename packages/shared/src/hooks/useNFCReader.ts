import { useState, useCallback } from "react";
import type { GateTagPayload } from "../types";

// NFC requires a physical device and expo-dev-client build.
// This hook provides the interface with a stub for Expo Go development.
export function useNFCReader() {
  const [reading, setReading] = useState(false);
  const [lastTag, setLastTag] = useState<GateTagPayload | null>(null);

  const startReading = useCallback(async () => {
    setReading(true);
    // In dev builds with expo-nfc-module:
    // NfcManager.start();
    // NfcManager.registerTagEvent((tag) => { ... });
  }, []);

  const stopReading = useCallback(async () => {
    setReading(false);
    // NfcManager.stop();
  }, []);

  return {
    reading,
    lastTag,
    startReading,
    stopReading,
  };
}
