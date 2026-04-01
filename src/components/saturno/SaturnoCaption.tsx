/**
 * SaturnoCaption
 *
 * Overlay de closed caption exibido na parte inferior da área de vídeo.
 * Renderiza os últimos N segmentos transcritos com speaker + texto.
 * Cada segmento desaparece automaticamente após SEGMENT_TTL_MS.
 */

import React, { useEffect, useRef, useState } from 'react';

export interface CaptionSegment {
  id: string;
  speaker: string;
  text: string;
  ts: string;
}

const MAX_VISIBLE = 2;       // segmentos visíveis ao mesmo tempo
const SEGMENT_TTL_MS = 6000; // tempo até o segmento sumir

export interface SaturnoCaptionProps {
  segments: CaptionSegment[];
}

export function SaturnoCaption({ segments }: SaturnoCaptionProps) {
  const visible = segments.slice(-MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-16 z-[70] flex flex-col items-center gap-1 px-6"
      aria-live="polite"
      aria-label="Closed captions"
    >
      {visible.map((seg) => (
        <CaptionLine key={seg.id} seg={seg} />
      ))}
    </div>
  );
}

function CaptionLine({ seg }: { seg: CaptionSegment }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), SEGMENT_TTL_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [seg.id]);

  if (!visible) return null;

  return (
    <div className="max-w-2xl rounded-lg bg-black/75 px-4 py-2 text-center backdrop-blur-sm">
      <span className="mr-2 text-xs font-semibold text-pink-400">{seg.speaker}:</span>
      <span className="text-sm leading-snug text-white">{seg.text}</span>
    </div>
  );
}

/**
 * useCaptionSegments
 *
 * Mantém a lista de segmentos de caption recebidos via WebSocket.
 * Descarta segmentos mais antigos que MAX_AGE_MS para não acumular
 * indefinidamente.
 */
const MAX_AGE_MS = 30_000;
const MAX_STORED = 50;

export function useCaptionSegments() {
  const [segments, setSegments] = useState<CaptionSegment[]>([]);

  const addSegment = (seg: Omit<CaptionSegment, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    setSegments((prev) => {
      const fresh = prev.filter((s) => now - new Date(s.ts).getTime() < MAX_AGE_MS);
      return [...fresh, { ...seg, id }].slice(-MAX_STORED);
    });
  };

  return { segments, addSegment };
}
