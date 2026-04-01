import { useEffect, useRef, useState } from 'react';

/**
 * Nível de áudio 0–1 a partir de um MediaStreamTrack de microfone (AnalyserNode).
 * Usado para animar o ícone de mic em resposta à captação real.
 */
export function useAudioLevelFromMediaStreamTrack(
  track: MediaStreamTrack | null | undefined,
  active: boolean,
): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !track || track.kind !== 'audio' || track.readyState === 'ended') {
      setLevel(0);
      return;
    }

    let ctx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    try {
      ctx = new AudioContext();
      const stream = new MediaStream([track]);
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
    } catch {
      setLevel(0);
      return;
    }

    const data = new Uint8Array(analyser!.frequencyBinCount);
    let resumeTried = false;

    const loop = () => {
      if (ctx && ctx.state === 'suspended' && !resumeTried) {
        resumeTried = true;
        void ctx.resume().catch(() => {});
      }
      analyser!.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length / 255;
      const boosted = Math.min(1, Math.pow(Math.max(avg, 0.001), 0.55) * 2.8);
      setLevel(boosted);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      try {
        source?.disconnect();
        analyser?.disconnect();
        void ctx?.close();
      } catch {
        /* noop */
      }
      setLevel(0);
    };
  }, [track, active]);

  return level;
}
