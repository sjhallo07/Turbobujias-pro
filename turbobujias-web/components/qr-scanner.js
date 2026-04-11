"use client";

import { useEffect, useId, useState } from "react";

export default function QrScanner({ onDetected }) {
  const regionId = useId().replace(/:/g, "");
  const [isActive, setIsActive] = useState(false);
  const [lastResult, setLastResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let html5QrCode;
    let isCancelled = false;

    async function startScanner() {
      if (!isActive || typeof window === "undefined") {
        return;
      }

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode(regionId);
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (isCancelled) {
              return;
            }

            setLastResult(decodedText);
            onDetected(decodedText);
            setIsActive(false);
          },
          () => {}
        );
      } catch (scannerError) {
        setError(
          scannerError?.message ||
            "No se pudo iniciar la cámara. Verifica permisos del navegador."
        );
        setIsActive(false);
      }
    }

    startScanner();

    return () => {
      isCancelled = true;
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [isActive, onDetected, regionId]);

  return (
    <div className="scanner-shell">
      <div className="scanner-region" id={regionId} />

      <div className="actions-row">
        <button
          className="button-primary"
          onClick={() => {
            setError("");
            setIsActive(true);
          }}
          type="button"
        >
          Activar cámara
        </button>
        <button
          className="button-secondary"
          onClick={() => setIsActive(false)}
          type="button"
        >
          Detener
        </button>
      </div>

      {lastResult ? <div className="muted">Última lectura: {lastResult}</div> : null}
      {error ? <div className="muted">{error}</div> : null}
    </div>
  );
}
