import { Mic, MicOff } from 'lucide-react';

export interface MicIconReactiveProps {
  muted: boolean;
  /** 0–1: captação local (AnalyserNode) */
  audioLevel?: number;
  /** Sem nível local: pulsa quando o participante está falando (ex.: LiveKit remoto) */
  isSpeaking?: boolean;
  iconClassName?: string;
  /** Cor do ícone quando ativo (ex.: text-gray-200, text-white) */
  activeClassName?: string;
}

/**
 * Ícone de microfone com halo/escala reativos ao nível de áudio ou ao estado "falando".
 */
export function MicIconReactive({
  muted,
  audioLevel = 0,
  isSpeaking = false,
  iconClassName = 'h-4 w-4',
  activeClassName = 'text-gray-200',
}: MicIconReactiveProps) {
  if (muted) {
    return <MicOff className={`${iconClassName} text-red-400`} />;
  }

  const hasSignal = audioLevel > 0.02;
  const pulse = isSpeaking && !hasSignal;
  const intensity = Math.min(1, audioLevel * 1.15 + (pulse ? 0.38 : 0));
  const scale = 1 + audioLevel * 0.24 + (pulse ? 0.1 : 0);

  return (
    <span className="relative inline-flex items-center justify-center overflow-visible [contain:paint]">
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-pink-400/50"
        style={{
          width: '170%',
          height: '170%',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${1 + intensity * 0.45})`,
          opacity: 0.12 + intensity * 0.55,
          transition: 'opacity 75ms linear, transform 75ms linear',
        }}
      />
      <Mic
        className={`relative ${activeClassName} ${iconClassName}`}
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 75ms linear',
        }}
      />
    </span>
  );
}
