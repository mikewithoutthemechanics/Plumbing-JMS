'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onSave: (dataUrl: string) => void;
  signatoryName?: string;
  onNameChange?: (name: string) => void;
  savedSignature?: string;
  disabled?: boolean;
}

export default function SignaturePad({ onSave, signatoryName = '', onNameChange, savedSignature, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (savedSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasInk(true);
        setEmpty(false);
      };
      img.src = savedSignature;
    }
  }, [savedSignature]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
    setEmpty(false);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    setHasInk(false);
  };

  const save = () => {
    if (empty || disabled) return;
    onSave(canvasRef.current!.toDataURL('image/png'));
  };

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Client Signature</h3>
      <div>
        <label className="label">Signatory Name</label>
        <input
          type="text"
          value={signatoryName}
          onChange={(e) => onNameChange?.(e.target.value)}
          className="input"
          placeholder="Full name of person signing"
          disabled={disabled}
        />
      </div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-[200px] rounded-lg cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="btn btn-secondary text-sm" disabled={disabled}>
          Clear
        </button>
        <button type="button" onClick={save} className="btn btn-primary text-sm" disabled={disabled || empty}>
          Save Signature
        </button>
        {hasInk && savedSignature && (
          <span className="text-green-600 text-sm self-center">✓ Signed</span>
        )}
      </div>
    </div>
  );
}
