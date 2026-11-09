import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertTriangle, Smartphone, CheckCircle2 } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureFile: (file: File) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureFile,
  title = 'Maak een foto',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [permissionState, setPermissionState] = useState<'requesting' | 'granted' | 'denied'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  }, []);

  const requestCameraAccess = useCallback(
    async (preferredFacing: 'environment' | 'user' = facingMode) => {
      stopStream();
      setPermissionState('requesting');
      setErrorMessage(null);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPermissionState('denied');
        setErrorMessage(
          'Je browser ondersteunt geen directe cameratoegang op deze verbinding. Gebruik de knop hieronder om je standaard telefooncamera te openen.'
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: preferredFacing },
              width: { ideal: 1920 },
              height: { ideal: 1440 },
            },
            audio: false,
          });
        } catch {
          // Fallback voor laptops/pc's of toestellen met 1 standaard camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        setPermissionState('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsVideoReady(true);
            videoRef.current?.play().catch(() => {});
          };
        }
      } catch (err: unknown) {
        setPermissionState('denied');
        const errName = err instanceof Error ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setErrorMessage(
            'Cameratoegang is nog niet toegestaan. Klik op "Toestemming vragen" en kies "Toestaan" in de melding van je browser, of gebruik je standaard telefooncamera hieronder.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setErrorMessage('Er is geen camera gevonden op dit apparaat.');
        } else {
          setErrorMessage(
            'Kon de camera niet openen. Geef toestemming in je browser of gebruik de knop hieronder.'
          );
        }
      }
    },
    [facingMode, stopStream]
  );

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }
    requestCameraAccess(facingMode);
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, requestCameraAccess, stopStream]);

  if (!isOpen) return null;

  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera_foto_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stopStream();
        onCaptureFile(file);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleNativeCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      stopStream();
      onCaptureFile(file);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={() => {
        stopStream();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl p-5 sm:p-6 text-zinc-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-extrabold text-zinc-100">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative w-full aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${
              permissionState === 'granted' ? 'block' : 'hidden'
            }`}
          />

          {permissionState === 'requesting' && (
            <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-400" />
              <p className="text-xs font-bold text-zinc-200">
                Toestemming vragen voor je camera...
              </p>
              <p className="text-[11px] text-zinc-400">
                Klik bovenin je scherm op &ldquo;Toestaan&rdquo; als je browser om cameratoegang vraagt.
              </p>
            </div>
          )}

          {permissionState === 'denied' && (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-zinc-300 leading-relaxed">{errorMessage}</p>
              <button
                type="button"
                onClick={() => requestCameraAccess(facingMode)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Toestemming vragen &amp; opnieuw proberen
              </button>
            </div>
          )}
        </div>

        {/* Camera Action Buttons */}
        {permissionState === 'granted' && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="px-3.5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Wissel tussen voor- en achtercamera"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Draai om</span>
            </button>

            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={!isVideoReady}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>Foto maken</span>
            </button>
          </div>
        )}

        {/* Native Phone Camera Fallback */}
        <div className="pt-2 border-t border-zinc-800/80">
          <input
            ref={nativeInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeCameraFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => nativeInputRef.current?.click()}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700/80 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>Open standaard telefooncamera-app</span>
          </button>
        </div>

        {permissionState === 'granted' && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Camera actief</span>
          </div>
        )}
      </div>
    </div>
  );
};
