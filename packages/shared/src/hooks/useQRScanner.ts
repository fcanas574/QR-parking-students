import { useState, useCallback } from "react";
import type { BarcodeScanningResult } from "expo-camera";
import type { GateTagPayload, VehicleQRPayload } from "../types";

export function useQRScanner() {
  const [scanning, setScanning] = useState(false);

  const parseScan = useCallback((result: BarcodeScanningResult): GateTagPayload | VehicleQRPayload | null => {
    try {
      const data = JSON.parse(result.data);
      // Gate tag: passive printed tags at lot entry/exit gates
      if (
        typeof data.gateId === "string" &&
        typeof data.lotId === "string" &&
        (data.type === "entry" || data.type === "exit")
      ) {
        return data as GateTagPayload;
      }
      // Vehicle QR: driver-app-generated, HMAC-signed for tamper-proofing
      if (
        typeof data.vehicleId === "string" &&
        typeof data.permitId === "string" &&
        typeof data.timestamp === "number" &&
        typeof data.hmac === "string"
      ) {
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
