import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLOR_PALETTE } from '../services/storage';
import { Palette } from 'lucide-react';

interface ColorWheelPickerProps {
  value: string;
  onChange: (hexColor: string) => void;
  compact?: boolean;
}

// Convert HSV (h: 0-360, s: 0-1, v: 0-1) to Hex (#rrggbb)
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  const r = Math.round((rPrime + m) * 255);
  const g = Math.round((gPrime + m) * 255);
  const b = Math.round((bPrime + m) * 255);

  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert Hex (#rrggbb) to HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const cleaned = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return { h: 35, s: 0.85, v: 0.95 };
  }
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / d) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / d + 2);
    } else {
      h = 60 * ((r - g) / d + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const wheelSize = compact ? 132 : 164;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  const initialHsv = hexToHsv(value || '#f59e0b');
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(initialHsv);
  const [hexInput, setHexInput] = useState<string>(value || '#f59e0b');

  // Sync external color changes
  useEffect(() => {
    if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
      setHexInput(value);
      setHsv(hexToHsv(value));
    }
  }, [value]);

  // Draw the HSV color wheel on the canvas whenever brightness (v) or wheelSize changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radius = wheelSize / 2;
    const imageData = ctx.createImageData(wheelSize, wheelSize);
    const data = imageData.data;

    for (let y = 0; y < wheelSize; y++) {
      for (let x = 0; x < wheelSize; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * wheelSize + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;
          const sat = Math.min(1, dist / radius);
          const hex = hsvToHex(angle, sat, hsv.v);

          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);

          // Anti-aliased edge
          const alpha = dist > radius - 1.2 ? Math.max(0, (radius - dist) / 1.2) * 255 : 255;

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(alpha);
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [wheelSize, hsv.v]);

  const pickColorAtPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const radius = wheelSize / 2;
      const x = clientX - rect.left - radius;
      const y = clientY - rect.top - radius;

      let angle = Math.atan2(y, x) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      const dist = Math.min(radius, Math.sqrt(x * x + y * y));
      const sat = Math.min(1, dist / radius);

      const nextHsv = { h: angle, s: sat, v: hsv.v };
      setHsv(nextHsv);
      const nextHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
      setHexInput(nextHex);
      onChange(nextHex);
    },
    [wheelSize, hsv.v, onChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      pickColorAtPointer(e.clientX, e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !e.touches[0]) return;
      pickColorAtPointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [pickColorAtPointer]);

  // Compute handle position on wheel
  const radius = wheelSize / 2;
  const angleRad = (hsv.h * Math.PI) / 180;
  const handleDist = hsv.s * (radius - 4);
  const markerX = radius + Math.cos(angleRad) * handleDist;
  const markerY = radius + Math.sin(angleRad) * handleDist;

  const handleBrightnessChange = (newV: number) => {
    const nextHsv = { ...hsv, v: newV };
    setHsv(nextHsv);
    const nextHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
    setHexInput(nextHex);
    onChange(nextHex);
  };

  return (
    <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Interactive 2D Color Wheel */}
        <div
          className="relative shrink-0 select-none touch-none cursor-crosshair"
          style={{ width: wheelSize, height: wheelSize }}
          onMouseDown={(e) => {
            isDraggingRef.current = true;
            pickColorAtPointer(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if (!e.touches[0]) return;
            isDraggingRef.current = true;
            pickColorAtPointer(e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          <canvas
            ref={canvasRef}
            width={wheelSize}
            height={wheelSize}
            className="rounded-full border border-zinc-700 shadow-inner block"
          />
          {/* Active Color Reticle */}
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 ring-1 ring-black/60"
            style={{
              left: `${markerX}px`,
              top: `${markerY}px`,
              backgroundColor: value,
            }}
          />
        </div>

        {/* Right Controls: Brightness Slider, Live Preview, Native Color Dialog & Hex */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg border border-zinc-700 shrink-0 shadow-sm"
                style={{ backgroundColor: value }}
              />
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Gekozen Kleur
                </div>
                <div className="font-mono text-xs font-bold text-zinc-100 uppercase">
                  {value}
                </div>
              </div>
            </div>

            {/* Native system color picker trigger as extra convenience */}
            <label
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-amber-400 cursor-pointer transition-colors"
              title="Open systeem-kleurenkiezer"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Systeemkiezer</span>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#f59e0b'}
                onChange={(e) => {
                  const next = e.target.value;
                  setHexInput(next);
                  setHsv(hexToHsv(next));
                  onChange(next);
                }}
                className="sr-only"
              />
            </label>
          </div>

          {/* Brightness / Darkness Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>Helderheid</span>
              <span className="tabular-nums">{Math.round(hsv.v * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.01"
              value={hsv.v}
              onChange={(e) => handleBrightnessChange(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg accent-amber-500 bg-zinc-800 cursor-pointer"
            />
          </div>

          {/* Hex Code Input */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500">HEX:</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const raw = e.target.value;
                setHexInput(raw);
                const normalized = raw.startsWith('#') ? raw : `#${raw}`;
                if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
                  setHsv(hexToHsv(normalized));
                  onChange(normalized);
                }
              }}
              placeholder="#f59e0b"
              maxLength={7}
              className="w-24 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quick Swatches */}
          <div className="pt-1 border-t border-zinc-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
              Of kies direct een basiskleur:
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => {
                    setHexInput(c);
                    setHsv(hexToHsv(c));
                    onChange(c);
                  }}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    value.toLowerCase() === c.toLowerCase()
                      ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-zinc-950'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
