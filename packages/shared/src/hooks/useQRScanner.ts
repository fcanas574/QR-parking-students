import { useState, useCallback } from "react";
import type { BarcodeScanningResult } from "expo-camera";
import type { GateTagPayload, VehicleQRPayload } from "../types";

export function useQRScanner() {
  const [scanning, setScanning] = useState(false);

  const parseScan = useCallback((result: BarcodeScanningResult): GateTagPayload | VehicleQRPayload | null => {
    try {
      const data = JSON.parse(result.data);
      if ("type" in data && (data.type === "entry" || data.type === "exit")) {
        return data as GateTagPayload;
      }
      if ("hmac" in data) {
        return data as VehicleQRPayload;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  return {
    scanning,
    setScanning,
    parseScan,
  };
}
