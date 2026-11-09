import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Beer as BeerIcon,
  Upload,
  Camera,
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { validateAndCompressImageFile, sanitizeImageUrl } from '../utils/security';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  title: string;
  subtitle?: string;
  initialPosition?: string; // e.g. "50% 50%" or "center center"
  initialZoom?: number; // e.g. 1.0
  onSavePosition?: (position: string, zoom: number, newPhotoUrl?: string) => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title,
  subtitle,
  initialPosition = '50% 50%',
  initialZoom = 1.0,
  onSavePosition,
}) => {
  // Parse initial position into x and y percentages
  const parsePos = (posStr: string): { x: number; y: number } => {
    if (!posStr) return { x: 50, y: 50 };
    const parts = posStr.trim().split(/\s+/);
    let x = 50;
    let y = 50;
    if (parts.length >= 2) {
      const parsedX = parseFloat(parts[0]);
      const parsedY = parseFloat(parts[1]);
      if (!isNaN(parsedX)) x = parsedX;
      if (!isNaN(parsedY)) y = parsedY;
    } else if (posStr === 'center top' || posStr === 'top') {
      x = 50;
      y = 15;
    } else if (posStr === 'center bottom' || posStr === 'bottom') {
      x = 50;
      y = 85;
    }
    return { x, y };
  };

  const [activeTab, setActiveTab] = useState<'view' | 'position'>('view');
  
  // View mode zoom & rotation state
  const [viewZoom, setViewZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  // Position mode state (X % and Y % for object-position, plus zoom & photoUrl)
  const initialCoord = parsePos(initialPosition);
  const [posX, setPosX] = useState<number>(initialCoord.x);
  const [posY, setPosY] = useState<number>(initialCoord.y);
  const [cropZoom, setCropZoom] = useState<number>(initialZoom || 1.0);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dragging support on preview
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const coord = parsePos(initialPosition);
      setPosX(coord.x);
      setPosY(coord.y);
      setCropZoom(initialZoom || 1.0);
      setCurrentPhotoUrl(photoUrl);
      setViewZoom(1.0);
      setRotation(0);
      setSavedSuccess(false);
      setUploadSuccess(false);
    }
  }, [isOpen, initialPosition, initialZoom, photoUrl]);

  if (!isOpen || !currentPhotoUrl) return null;

  const currentPositionStyle = `${posX}% ${posY}%`;

  const handleSave = () => {
    if (onSavePosition) {
      onSavePosition(
        currentPositionStyle,
        cropZoom,
        currentPhotoUrl !== photoUrl ? currentPhotoUrl : undefined
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const processCapturedFile = async (file: File) => {
    try {
      const compressedDataUrl = await validateAndCompressImageFile(file, 850, 0.82);
      setCurrentPhotoUrl(compressedDataUrl);
      setPosX(50);
      setPosY(50);
      setCropZoom(1.0);
      if (onSavePosition) {
        onSavePosition('50% 50%', 1.0, compressedDataUrl);
      }
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (err) {
      console.warn('Image upload rejected:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processCapturedFile(file);
  };

  const handleReset = () => {
    setPosX(50);
    setPosY(50);
    setCropZoom(1.0);
  };

  const applyPreset = (x: number, y: number, z: number = 1.0) => {
    setPosX(x);
    setPosY(y);
    setCropZoom(z);
  };

  // Drag to position handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: posX,
      startY: posY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;
    
    // Sensitivity factor
    const newX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startX - deltaX * 0.3)));
    const newY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startY - deltaY * 0.3)));
    
    setPosX(newX);
    setPosY(newY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/95 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-zinc-100 line-clamp-1">
                {title}
              </h3>
              {subtitle && (
                <span className="hidden sm:inline-block text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                  {subtitle}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {activeTab === 'view'
                ? 'Volledige grootte bekijken • Scroll of gebruik de knoppen om in te zoomen'
                : 'Sleep de foto of gebruik de schuifregelaars om de uitsnede aan te passen'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode switch tabs */}
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setActiveTab('view')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'view'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Volledige</span> Grootte
              </button>

              <button
                onClick={() => setActiveTab('position')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'position'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Positioneren
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors"
              title="Sluiten"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: FULL RESOLUTION VIEWER */}
        {activeTab === 'view' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-black/50 relative">
            {/* Image viewport */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[360px] sm:min-h-[480px]">
              <div
                className="transition-transform duration-150 ease-out flex items-center justify-center"
                style={{
                  transform: `scale(${viewZoom}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={currentPhotoUrl}
                  alt={title}
                  className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl border border-zinc-800/60 select-none"
                  draggable={false}
                />
              </div>
            </div>

            {/* Bottom Floating Control Bar */}
            <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <span>Zoom: {Math.round(viewZoom * 100)}%</span>
                {rotation !== 0 && <span>• Rotatie: {rotation}°</span>}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                  title="Uitzoomen"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setViewZoom(1.0)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
                  title="100% Passend"
                >
                  100%
                </button>

                <button
                  onClick={() => setViewZoom((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                  title="Inzoomen"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                  title="Draaien (90°)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setActiveTab('position')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all ml-2"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Foto Passend Maken
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE POSITIONING & CROPPING TOOL */}
        {activeTab === 'position' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 bg-zinc-950">
            {/* Left: Interactive Canvas with Draggable Viewport */}
            <div className="flex-1 p-5 flex flex-col items-center justify-center space-y-4">
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  <Move className="w-3 h-3" />
                  Interactieve Uitsnede
                </span>
                <h4 className="text-sm font-bold text-zinc-200">
                  Sleep de foto met de muis of vinger om de focus te bepalen
                </h4>
              </div>

              {/* Interactive Viewfinder Box */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 cursor-grab active:cursor-grabbing group select-none touch-none bg-zinc-900"
              >
                <img
                  src={currentPhotoUrl}
                  alt={title}
                  draggable={false}
                  className="w-full h-full object-cover select-none pointer-events-none transition-all duration-75"
                  style={{
                    objectPosition: currentPositionStyle,
                    transform: `scale(${cropZoom})`,
                    transformOrigin: currentPositionStyle,
                  }}
                />

                {/* Crosshair guide overlay */}
                <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-3xl" />
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>

                {/* Subtle center indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-amber-400/60 bg-amber-500/20 pointer-events-none flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                </div>

                {/* Helper hint badge */}
                <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-950/80 text-zinc-300 border border-zinc-700 backdrop-blur-xs">
                    ✋ Versleep om te positioneren
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5 w-full max-w-sm">
                <span className="text-[11px] font-semibold text-zinc-400 block text-center">
                  Snelle Positie Presets:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  <button
                    onClick={() => applyPreset(50, 15)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition-all ${
                      posY <= 25 && posX >= 40 && posX <= 60
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Bovenkant (ideaal voor flessen/blikken waarvan de dop/hals bovenin zit)"
                  >
                    <ArrowUp className="w-3.5 h-3.5 mb-0.5" />
                    Boven
                  </button>

                  <button
                    onClick={() => applyPreset(50, 50)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition-all ${
                      posY >= 40 && posY <= 60 && posX >= 40 && posX <= 60
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Midden / Centreren"
                  >
                    <Crosshair className="w-3.5 h-3.5 mb-0.5" />
                    Midden
                  </button>

                  <button
                    onClick={() => applyPreset(50, 85)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition-all ${
                      posY >= 75 && posX >= 40 && posX <= 60
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Onderkant"
                  >
                    <ArrowDown className="w-3.5 h-3.5 mb-0.5" />
                    Onder
                  </button>

                  <button
                    onClick={() => applyPreset(15, 50)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition-all ${
                      posX <= 25 && posY >= 40 && posY <= 60
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Links"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mb-0.5" />
                    Links
                  </button>

                  <button
                    onClick={() => applyPreset(85, 50)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition-all ${
                      posX >= 75 && posY >= 40 && posY <= 60
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="Rechts"
                  >
                    <ArrowRight className="w-3.5 h-3.5 mb-0.5" />
                    Rechts
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Fine-tuning sliders & Live Preview in Card context */}
            <div className="w-full lg:w-80 p-5 flex flex-col justify-between space-y-6 bg-zinc-900/40">
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Nauwkeurige Afstelling
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Positie: X: {posX}% • Y: {posY}% • Zoom: {cropZoom.toFixed(1)}x
                  </p>
                </div>

                {/* Upload / Replace Photo Option (Camera + Galerij) */}
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCameraModalOpen(true)}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Maak foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:border-amber-500/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Kies foto</span>
                    </button>
                  </div>
                  {uploadSuccess && (
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>Nieuwe foto geladen!</span>
                    </div>
                  )}
                </div>

                {/* Vertical Slider (Y-axis) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span>Verticale Hoogte (Y)</span>
                    <span className="font-mono text-amber-400">{posY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Boven (0%)</span>
                    <span>Midden (50%)</span>
                    <span>Onder (100%)</span>
                  </div>
                </div>

                {/* Horizontal Slider (X-axis) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span>Horizontaal (X)</span>
                    <span className="font-mono text-amber-400">{posX}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Links (0%)</span>
                    <span>Midden (50%)</span>
                    <span>Rechts (100%)</span>
                  </div>
                </div>

                {/* Zoom Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <span>Inzoomen / Schaal</span>
                    <span className="font-mono text-amber-400">{cropZoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>1.0x (normaal)</span>
                    <span>1.75x</span>
                    <span>2.5x (close-up)</span>
                  </div>
                </div>

                {/* Live Preview in Card Mockup */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Voorvertoning in Bier-Card:
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-zinc-900 shadow-md">
                      <img
                        src={currentPhotoUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: currentPositionStyle,
                          transform: `scale(${cropZoom})`,
                          transformOrigin: currentPositionStyle,
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-200 truncate">{title}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{subtitle || 'Craft Bier'}</div>
                      <span className="inline-block mt-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        Past perfect ✓
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSave}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3] text-zinc-950" />
                      <span>Positionering Opgeslagen!</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Positionering Opslaan</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>

                  <button
                    onClick={onClose}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-800"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        title="Maak een nieuwe foto"
        onCaptureFile={(file) => {
          processCapturedFile(file);
        }}
      />
    </div>
  );
};
