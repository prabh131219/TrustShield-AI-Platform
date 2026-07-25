import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QrScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

export function QrScanner({ onResult, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setActive(true);
        }
      } catch (e) {
        setError(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Camera permission denied. Try uploading a QR image instead.'
            : 'Could not access camera. Try uploading a QR image instead.',
        );
        setMode('upload');
      }
    }
    void start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (mode !== 'camera' || !active) return;
    const tick = () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            onResult(code.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, active, onResult]);

  const handleFile = async (file: File) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
        URL.revokeObjectURL(url);
        if (code && code.data) {
          onResult(code.data);
        } else {
          setError('No QR code found in the image. Try a clearer image.');
        }
      } else {
        URL.revokeObjectURL(url);
        setError('Could not read the image.');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not load the image file.');
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm">
      <div className="glass-strong relative w-full max-w-md overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Scan QR code</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setMode('camera')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                mode === 'camera' ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30' : 'bg-white/5 text-slate-400'
              }`}
            >
              <Camera className="h-4 w-4" />
              Camera
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                mode === 'upload' ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30' : 'bg-white/5 text-slate-400'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              Upload
            </button>
          </div>

          {mode === 'camera' ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* scan frame */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-8 rounded-xl border-2 border-cyan-400/60" />
                <div className="absolute inset-x-8 top-1/2 h-0.5 bg-cyan-400/80 animate-scan-line" />
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-cyan-300">
                Point at a UPI QR code
              </div>
            </div>
          ) : (
            <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] transition hover:border-cyan-500/40 hover:bg-white/5">
              <Upload className="h-8 w-8 text-slate-500" />
              <p className="mt-3 text-sm text-slate-400">Tap to upload a QR image</p>
              <p className="mt-1 text-xs text-slate-600">PNG, JPG, WEBP</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
