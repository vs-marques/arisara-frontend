import React, { useEffect, useRef } from 'react';
import type { VideoTrack } from 'livekit-client';

interface VideoTrackViewProps {
  track?: VideoTrack;
  /** Vídeo local deve ficar muted para evitar feedback */
  muted?: boolean;
  className?: string;
}

/**
 * Anexa um VideoTrack do LiveKit a um elemento <video /> e faz detach no cleanup.
 */
export function VideoTrackView({ track, muted = true, className }: VideoTrackViewProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  if (!track) return null;

  return (
    <video
      ref={ref}
      className={className}
      muted={muted}
      autoPlay
      playsInline
    />
  );
}
