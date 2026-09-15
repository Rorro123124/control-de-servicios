import { useState, useEffect, useRef } from "react";

/**
 * BarcodeScanner
 *
 * Props:
 *   onDetect(barcode: string) — se llama cuando se detecta un codigo
 *   onClose()                 — cerrar el scanner
 *
 * Modos:
 *   1. Camara (BarcodeDetector API — Chrome en Android/PC)
 *   2. Input de texto (para pistolas de codigo de barras USB)
 */

export default function BarcodeScanner({ onDetect, onClose }) {
  const [mode,       setMode]       = useState("camera"); // "camera" | "keyboard"
  const [cameraOk,   setCameraOk]   = useState(null);      // null=checking, true, false
  const [scanning,   setScanning]   = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastRead,   setLastRead]   = useState("");
  const [error,      setError]      = useState("");

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const detectorRef = useRef(null);
  const rafRef      = useRef(null);

  // Comprobar soporte de BarcodeDetector
  useEffect(() => {
    if ("BarcodeDetector" in window) {
      setCameraOk(true);
      detectorRef.current = new window.BarcodeDetector({
        formats: [
          "code_128", "code_39", "ean_13", "ean_8",
          "upc_a", "upc_e", "qr_code", "data_matrix",
        ],
      });
    } else {
      setCameraOk(false);
      setMode("keyboard");
    }
  }, []);

  // Arrancar camara
  useEffect(() => {
    if (mode !== "camera" || !cameraOk) return;

    let active = true;

    const start = async () => {
      setError("");
      setScanning(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setScanning(true);
      } catch (e) {
        if (!active) return;
        setError("No se pudo acceder a la camara. Usa el modo manual.");
        setCameraOk(false);
        setMode("keyboard");
      }
    };

    start();

    return () => {
      active = false;
      stopCamera();
    };
  }, [mode, cameraOk]);

  // Loop de deteccion
  useEffect(() => {
    if (!scanning || !detectorRef.current || !videoRef.current) return;

    let alive = true;

    const detect = async () => {
      if (!alive || !videoRef.current || videoRef.current.readyState < 2) {
        if (alive) rafRef.current = requestAnimationFrame(detect);
        return;
      }
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0 && alive) {
          const code = barcodes[0].rawValue;
          setLastRead(code);
          onDetect(code);
          return; // parar despues de detectar
        }
      } catch (_) {
        // frame fallido, seguir
      }
      if (alive) rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scanning, onDetect]);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    setLastRead(code);
    setManualCode("");
    onDetect(code);
  };

  // Styles
  const overlay = {
    position:       "fixed",
    inset:          0,
    background:     "rgba(0,0,0,0.85)",
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    zIndex:         2000,
    padding:        16,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div
        style={{
          background:   "var(--bg-primary)",
          borderRadius: 18,
          padding:      24,
          width:        "100%",
          maxWidth:     400,
          position:     "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: 18, fontWeight: 700 }}>
            Escanear codigo
          </h3>
          <button
            onClick={onClose}
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", color: "var(--text-primary)" }}
          >
            X
          </button>
        </div>

        {/* Tabs modo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {cameraOk !== false && (
            <button
              onClick={() => setMode("camera")}
              style={{
                flex:         1,
                background:   mode === "camera" ? "var(--accent-color)" : "var(--bg-secondary)",
                color:        mode === "camera" ? "#fff" : "var(--text-primary)",
                border:       "1px solid var(--border-color)",
                borderRadius: 8,
                padding:      "8px 0",
                cursor:       "pointer",
                fontWeight:   mode === "camera" ? 700 : 400,
                fontSize:     13,
              }}
            >
              Camara
            </button>
          )}
          <button
            onClick={() => { stopCamera(); setMode("keyboard"); }}
            style={{
              flex:         1,
              background:   mode === "keyboard" ? "var(--accent-color)" : "var(--bg-secondary)",
              color:        mode === "keyboard" ? "#fff" : "var(--text-primary)",
              border:       "1px solid var(--border-color)",
              borderRadius: 8,
              padding:      "8px 0",
              cursor:       "pointer",
              fontWeight:   mode === "keyboard" ? 700 : 400,
              fontSize:     13,
            }}
          >
            Manual / USB
          </button>
        </div>

        {/* Modo camara */}
        {mode === "camera" && (
          <div>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 12 }}>
              <video
                ref={videoRef}
                style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }}
                muted
                playsInline
              />
              {scanning && (
                <div style={{
                  position:   "absolute",
                  inset:      0,
                  display:    "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <div style={{
                    width:        "70%",
                    height:       "40%",
                    border:       "3px solid var(--accent-color)",
                    borderRadius: 8,
                    boxShadow:    "0 0 0 2000px rgba(0,0,0,0.35)",
                  }} />
                </div>
              )}
              {!scanning && (
                <div style={{
                  position:       "absolute",
                  inset:          0,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          "#fff",
                  fontSize:       14,
                }}>
                  Iniciando camara...
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 8 }}>
              Apunta la camara al codigo de barras
            </div>
          </div>
        )}

        {/* Modo teclado / pistola USB */}
        {mode === "keyboard" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
              Escribe o escanea el codigo con la pistola USB:
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManual()}
                placeholder="Codigo de barras..."
                autoFocus
                style={{
                  flex:         1,
                  padding:      "10px 12px",
                  borderRadius: 8,
                  border:       "1px solid var(--border-color)",
                  background:   "var(--bg-secondary)",
                  color:        "var(--text-primary)",
                  fontSize:     16,
                }}
              />
              <button
                onClick={handleManual}
                style={{
                  background:   "var(--accent-color)",
                  color:        "#fff",
                  border:       "none",
                  borderRadius: 8,
                  padding:      "10px 18px",
                  cursor:       "pointer",
                  fontWeight:   700,
                  fontSize:     14,
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 10, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Ultimo leido */}
        {lastRead && (
          <div style={{
            marginTop:    12,
            background:   "#d1fae5",
            borderRadius: 8,
            padding:      "10px 14px",
            display:      "flex",
            justifyContent: "space-between",
            alignItems:   "center",
          }}>
            <span style={{ color: "#065f46", fontSize: 13, fontWeight: 600 }}>
              Leido: {lastRead}
            </span>
            <span style={{ fontSize: 20 }}>ok</span>
          </div>
        )}

        {/* Tip */}
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
          La camara funciona en Chrome (Android o PC). Para iPhone usa el modo Manual.
        </div>
      </div>
    </div>
  );
}
