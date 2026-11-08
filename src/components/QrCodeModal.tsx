import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

export function extractInviteCodeFromUrlOrString(raw: string): string {
  const trimmed = raw.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const code = url.searchParams.get('invite') || url.searchParams.get('friend');
      if (code) return code.trim();
    }
  } catch {}
  const match = trimmed.match(/[?&](?:invite|friend)=([^&]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]).trim();
  }
  return trimmed;
}

interface QrShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  userName: string;
}

export const QrShowModal: React.FC<QrShowModalProps> = ({
  isOpen,
  onClose,
  inviteUrl,
  userName,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !inviteUrl) return;
    QRCode.toDataURL(inviteUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Fout bij genereren van QR-code:', err));
  }, [isOpen, inviteUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-zinc-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 text-zinc-100 space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold">
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            Jouw Cervisium QR-Code
          </div>
          <h3 className="text-xl font-extrabold text-zinc-100">{userName}</h3>
          <p className="text-xs text-zinc-400">
            Laat je vriend deze QR-code scannen om direct vrienden te worden!
          </p>
        </div>

        {/* QR CODE CONTAINER */}
        <div className="p-4 bg-white rounded-2xl shadow-inner flex items-center justify-center max-w-[240px] mx-auto border-4 border-amber-500/30">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Uitnodigings QR code" className="w-full h-auto rounded-lg" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs font-bold">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          )}
        </div>

        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />
                Link Gekopieerd!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Kopieer Uitnodigingslink
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface QrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanned: (inviteCode: string) => void;
  isProcessing?: boolean;
}

export const QrScanModal: React.FC<QrScanModalProps> = ({
  isOpen,
  onClose,
  onScanned,
  isProcessing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const scannedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    scannedRef.current = false;
    setCameraError(null);
    setFileError(null);

    let active = true;
    let animationFrameId: number;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          animationFrameId = requestAnimationFrame(tick);
        }
      } catch (err) {
        console.warn('Camera niet beschikbaar:', err);
        setCameraError(
          'Geen toegang tot camera. Zorg voor cameratoestemming in je browser of upload een foto van de QR-code.'
        );
      }
    }

    function tick() {
      if (!active || scannedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data && !scannedRef.current) {
            scannedRef.current = true;
            const extracted = extractInviteCodeFromUrlOrString(code.data);
            onScanned(extracted);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    }

    startCamera();

    return () => {
      active = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, onScanned]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const extracted = extractInviteCodeFromUrlOrString(code.data);
            onScanned(extracted);
          } else {
            setFileError('Geen geldige QR-code gevonden op de geselecteerde afbeelding.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-zinc-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 text-zinc-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            Scanner Active
          </div>
          <h3 className="text-xl font-extrabold text-zinc-100">Scan Vriend QR-Code</h3>
          <p className="text-xs text-zinc-400">
            Houd de camera op de QR-code van je vriend om direct een vriendschapsverzoek te accepteren.
          </p>
        </div>

        {/* CAMERA FEED CONTAINER */}
        <div className="relative w-full aspect-square bg-zinc-950 rounded-2xl overflow-hidden border-2 border-amber-500/30 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* SCANNER OVERLAY MARKS */}
          {!cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-amber-400/80 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-amber-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="text-xs font-extrabold">Vriend toevoegen...</span>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {fileError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {/* UPLOAD ALTERNATIEF */}
        <div className="pt-2">
          <input
            type="file"
            accept="image/*"
            id="qr-file-input"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="qr-file-input"
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            Kies QR-foto uit je galerij / bestanden
          </label>
        </div>
      </div>
    </div>
  );
};
