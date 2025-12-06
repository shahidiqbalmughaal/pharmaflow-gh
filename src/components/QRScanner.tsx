import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
          toast.success("QR Code scanned successfully");
        },
        (errorMessage) => {
          // Ignore error messages during scanning
        }
      );

      setIsScanning(true);
    } catch {
      toast.error("Failed to start camera. Please check permissions.");
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch {
        // Silent fail - scanner cleanup is best-effort
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="space-y-2">
      {!isScanning ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startScanning}
          className="w-full gap-2"
        >
          <Camera className="h-4 w-4" />
          Scan QR Code
        </Button>
      ) : (
        <div className="space-y-2">
          <div id="qr-reader" className="border rounded-lg overflow-hidden"></div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopScanning}
            className="w-full gap-2"
          >
            <X className="h-4 w-4" />
            Stop Scanning
          </Button>
        </div>
      )}
    </div>
  );
}
