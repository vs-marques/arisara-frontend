/**
 * useSaturnoLiveCaption
 *
 * Captura o áudio do microfone local em chunks de CHUNK_MS milissegundos e
 * envia cada chunk para o endpoint POST /meet/{room}/caption/audio.
 * O backend transcreve via Whisper e faz broadcast do caption para todos os
 * participantes da sala via WebSocket.
 *
 * Requer que o usuário já tenha concedido permissão de microfone (o que é
 * garantido pelo fluxo de prejoin da Saturno Meet).
 */

import { useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL, getStoredToken } from '@/config/api';

const CHUNK_MS = 3000; // 3 segundos por chunk

const CAPTION_AUDIO_PATH = (roomPublicId: string) =>
  `${API_BASE_URL}/api/v1/saturno/meet/${encodeURIComponent(roomPublicId)}/caption/audio`;

export interface UseSaturnoLiveCaptionOptions {
  /** Liga/desliga a captura. */
  enabled: boolean;
  /** meet_slug ou room_code da sala. */
  roomPublicId: string;
  /** Nome exibido do participante que está falando. */
  speakerName: string;
  /** Código do idioma falado: 'auto' | 'pt' | 'en' | 'es' | ... */
  lang: string;
  /** Segredo do convite (guest). Null para usuários logados. */
  joinSecret: string | null;
}

export function useSaturnoLiveCaption({
  enabled,
  roomPublicId,
  speakerName,
  lang,
  joinSecret,
}: UseSaturnoLiveCaptionOptions): void {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef(false);

  const buildParams = useCallback((): string => {
    const params = new URLSearchParams({ speaker: speakerName, lang });
    if (joinSecret) {
      params.set('join', joinSecret);
    } else {
      const token = getStoredToken();
      if (token) params.set('access_token', token);
    }
    return params.toString();
  }, [speakerName, lang, joinSecret]);

  const sendChunk = useCallback(
    async (blob: Blob): Promise<void> => {
      if (!blob.size || abortRef.current) return;
      const form = new FormData();
      form.append('audio', blob, 'audio.webm');
      try {
        await fetch(`${CAPTION_AUDIO_PATH(roomPublicId)}?${buildParams()}`, {
          method: 'POST',
          body: form,
        });
      } catch {
        // best-effort: falha silenciosa para não interromper a reunião
      }
    },
    [roomPublicId, buildParams],
  );

  useEffect(() => {
    if (!enabled || !roomPublicId) return;

    abortRef.current = false;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((s) => {
        if (abortRef.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }

        stream = s;
        streamRef.current = s;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        recorder = new MediaRecorder(stream, { mimeType });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            sendChunk(e.data).catch(() => {});
          }
        };

        recorder.start(CHUNK_MS);
      })
      .catch((err) => {
        // Permissão negada ou dispositivo indisponível — não bloqueia a reunião
        console.warn('saturno_caption.mic_error', err instanceof Error ? err.message : String(err));
      });

    return () => {
      abortRef.current = true;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      recorderRef.current = null;
      streamRef.current = null;
    };
  }, [enabled, roomPublicId, sendChunk]);
}
