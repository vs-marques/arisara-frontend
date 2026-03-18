import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, SmilePlus, MoreHorizontal, MessageCircle, Sparkles, Volume2, Droplets, CircleDot } from 'lucide-react';

interface MockParticipant {
  id: string;
  name: string;
  isSpeaking?: boolean;
  micMuted?: boolean;
}

interface ChatMessage {
  id: string;
  author: string;
  isMe: boolean;
  content: string;
  createdAt: Date;
}

type LayoutMode = 'auto' | 'tiled' | 'spotlight' | 'sidebar';

interface UiParticipant {
  id: string;
  name: string;
  isSelf?: boolean;
  micMuted?: boolean;
  hasVideo?: boolean;
}

const participantsMock: MockParticipant[] = [
  { id: '1', name: 'Você', isSpeaking: true },
  { id: '2', name: 'Ana Silva' },
  { id: '3', name: 'Carlos Lima', micMuted: true },
  { id: '4', name: 'João Souza' },
];

export default function SaturnoMeetLive() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();

  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showSidePane, setShowSidePane] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');
  const [maxTiles, setMaxTiles] = useState(16);
  const [hideTilesWithoutVideo, setHideTilesWithoutVideo] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [recording, setRecording] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfCamRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const [clientId] = useState(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  });

  const participants = participantsMock;
  const mainParticipant = participants[0];
  const sideParticipants = participants.slice(1);
  const showMainVideo = (screenSharing || camEnabled) && !videoError;

  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const el = gridRef.current;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setGridSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showSidePane]);

  const uiParticipantsAll: UiParticipant[] = [
    { id: 'self', name: mainParticipant.name, isSelf: true, micMuted: !micEnabled, hasVideo: camEnabled },
    ...sideParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      micMuted: !!p.micMuted,
      hasVideo: true,
    })),
  ];

  const uiParticipants = hideTilesWithoutVideo
    ? uiParticipantsAll.filter((p) => p.hasVideo)
    : uiParticipantsAll;

  const effectiveLayout: LayoutMode = (() => {
    if (screenSharing) return 'spotlight';
    if (layoutMode !== 'auto') return layoutMode;
    if (showSidePane) return 'sidebar';
    return uiParticipants.length >= 3 ? 'tiled' : 'spotlight';
  })();

  const computeGridCols = (count: number, w: number, h: number, aspect = 16 / 9) => {
    if (!count || w <= 0 || h <= 0) return 1;
    const max = Math.min(count, 8);
    let bestCols = 1;
    let bestTileArea = 0;
    for (let cols = 1; cols <= max; cols++) {
      const rows = Math.ceil(count / cols);
      const tileW = w / cols;
      const tileH = tileW / aspect;
      if (rows * tileH > h) continue;
      const area = tileW * tileH;
      if (area > bestTileArea) {
        bestTileArea = area;
        bestCols = cols;
      }
    }
    return bestCols;
  };

  useEffect(() => {
    const startVideo = async () => {
      if (!camEnabled) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (selfCamRef.current) selfCamRef.current.srcObject = null;
        if (mainVideoRef.current && !screenSharing) mainVideoRef.current.srcObject = null;
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setVideoError(
          t('saturno.prejoin.videoUnsupported', {
            defaultValue: 'Seu navegador não suporta acesso à câmera.',
          })
        );
        return;
      }

      try {
        setVideoError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (selfCamRef.current) {
          selfCamRef.current.srcObject = stream;
          await selfCamRef.current.play().catch(() => {});
        }
        if (mainVideoRef.current && !screenSharing) {
          mainVideoRef.current.srcObject = stream;
          await mainVideoRef.current.play().catch(() => {});
        }
      } catch {
        setVideoError(
          t('saturno.prejoin.videoError', {
            defaultValue: 'Não foi possível acessar sua câmera.',
          })
        );
      }
    };

    startVideo().catch(() => {});

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (selfCamRef.current) selfCamRef.current.srcObject = null;
    };
  }, [camEnabled, screenSharing, t]);
  useEffect(() => {
    if (!code) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/v1/saturno/meet/ws/${encodeURIComponent(code)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          id: string;
          author: string;
          content: string;
          clientId?: string;
          createdAt?: string;
        };

        if (!data.content?.trim()) return;

        setMessages((prev) => [
          ...prev,
          {
            id: data.id || `${Date.now()}`,
            author: data.author || 'Participante',
            isMe: data.clientId === clientId,
            content: data.content,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          },
        ]);
      } catch {
        // Silencia erros de parse; protocolo é simples.
      }
    };

    ws.onerror = () => {
      // Para v1, apenas ignoramos; futuramente podemos exibir toast.
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [code, clientId]);

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const payload = {
      author: 'Você',
      content: trimmed,
      clientId,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      // Fallback local caso WS não esteja disponível
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          author: payload.author,
          isMe: true,
          content: payload.content,
          createdAt: new Date(),
        },
      ]);
    }

    setChatInput('');
  };

  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenSharing(false);

      if (mainVideoRef.current) {
        if (camEnabled && streamRef.current) {
          mainVideoRef.current.srcObject = streamRef.current;
          await mainVideoRef.current.play().catch(() => {});
        } else {
          mainVideoRef.current.srcObject = null;
        }
      }
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = screenStream;
      setScreenSharing(true);
      if (mainVideoRef.current) {
        mainVideoRef.current.srcObject = screenStream;
        await mainVideoRef.current.play().catch(() => {});
      }

      const [videoTrack] = screenStream.getVideoTracks();
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          handleToggleScreenShare().catch(() => {});
        });
      }
    } catch {
      // Usuário cancelou ou erro
    }
  };

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-72px)] flex-col bg-[#05030a] px-1 pb-3 pt-2 md:px-3 lg:px-6">
        <div className="mx-auto flex w-full max-w-none flex-1 items-start gap-1.5 lg:gap-3">
          {/* Área de vídeo principal */}
          <div className={`flex flex-1 flex-col gap-3 ${showSidePane ? 'md:w-[78%]' : 'w-full'}`}>
            {/* Altura baseada no viewport: ocupa quase toda a altura visível e se mistura com o fundo */}
            <div className="relative h-[calc(100vh-110px)] w-full overflow-hidden rounded-3xl bg-transparent">
              {/* Header da sala */}
              <div className="absolute left-4 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                {t('saturno.live.meetingTitle', {
                  defaultValue: 'Reunião Saturno',
                })}
              </div>

              {/* Vídeo real ou avatar mock */}
              {effectiveLayout === 'tiled' ? (
                <div ref={gridRef} className="h-full w-full p-3">
                  {(() => {
                    const visible = uiParticipants.slice(0, Math.max(1, maxTiles));
                    const cols = computeGridCols(visible.length, gridSize.width, gridSize.height, 16 / 9);
                    return (
                      <div
                        className="grid h-full w-full gap-3"
                        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                      >
                        {visible.map((p) => (
                          <div
                            key={p.id}
                            className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60"
                          >
                            <div className="absolute inset-0">
                              {p.isSelf && camEnabled && streamRef.current ? (
                                <video
                                  ref={(el) => {
                                    if (!el) return;
                                    if (el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
                                    el.play().catch(() => {});
                                  }}
                                  className={`h-full w-full object-cover ${blurEnabled ? 'blur-sm' : ''}`}
                                  muted
                                  autoPlay
                                  playsInline
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-black">
                                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
                                    {p.name.charAt(0).toUpperCase()}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="relative z-10 flex h-full items-end justify-between p-3">
                              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
                                {p.name}
                              </span>
                              <span className="rounded-full bg-black/60 px-2 py-0.5">
                                {p.micMuted ? (
                                  <MicOff className="h-3 w-3 text-red-400" />
                                ) : (
                                  <Mic className="h-3 w-3 text-gray-200" />
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
                  {showMainVideo ? (
                    <video
                      ref={mainVideoRef}
                      className={`h-full w-full object-cover ${blurEnabled ? 'blur-sm' : ''}`}
                      muted
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-black">
                      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-pink-500/80 text-4xl font-semibold text-white">
                        {mainParticipant.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

              {/* Nome e status no canto inferior esquerdo */}
              <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                {screenSharing ? t('saturno.live.sharingScreen', { defaultValue: 'Você está apresentando' }) : mainParticipant.name}
                {mainParticipant.isSpeaking && (
                  <span className="ml-1 text-[10px] text-pink-300">
                    {t('saturno.live.speaking', { defaultValue: 'falando' })}
                  </span>
                )}
              </div>

              {/* Faixa de participantes pequenos na lateral direita (desktop) */}
              {(effectiveLayout === 'spotlight' || effectiveLayout === 'sidebar') && (
                <div className="pointer-events-none absolute inset-y-4 right-4 hidden w-56 flex-col gap-2 md:flex">
                {screenSharing && (
                  <div className="pointer-events-auto relative flex h-24 flex-none items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white">
                    <div className="absolute inset-0">
                      {camEnabled ? (
                        <video
                          ref={selfCamRef}
                          className={`h-full w-full object-cover ${blurEnabled ? 'blur-sm' : ''}`}
                          muted
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/60">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
                            {mainParticipant.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative z-10 flex w-full items-end justify-between">
                      <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px]">
                        {mainParticipant.name}
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
                        {micEnabled ? (
                          <Mic className="h-3 w-3 text-gray-200" />
                        ) : (
                          <MicOff className="h-3 w-3 text-red-400" />
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {sideParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="pointer-events-auto flex h-24 flex-none items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px]">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="max-w-[80px] truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.micMuted ? (
                        <MicOff className="h-3 w-3 text-red-400" />
                      ) : (
                        <Mic className="h-3 w-3 text-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
                </div>
              )}
                </>
              )}

              {/* Barra inferior de controles sobre o vídeo */}
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-4 py-2 shadow-[0_15px_60px_rgba(0,0,0,0.7)]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full ${
                      speakerEnabled ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-400'
                    } hover:bg-white/20`}
                    onClick={() => setSpeakerEnabled((v) => !v)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setMicEnabled((v) => !v)}
                  >
                    {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setCamEnabled((v) => !v)}
                  >
                    {camEnabled ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-red-400" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full ${
                      screenSharing ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    onClick={() => {
                      handleToggleScreenShare().catch(() => {});
                    }}
                  >
                    <MonitorUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <SmilePlus className="h-4 w-4" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      side="top"
                      sideOffset={14}
                      className="w-80 rounded-2xl border-white/10 bg-black/90 p-4 text-white shadow-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">Adjust view</p>
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            Selection is saved for future meetings
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {([
                          { id: 'auto', label: 'Auto (dynamic)' },
                          { id: 'tiled', label: 'Tiled' },
                          { id: 'spotlight', label: 'Spotlight' },
                          { id: 'sidebar', label: 'Sidebar' },
                        ] as const).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                              layoutMode === m.id
                                ? 'border-white/20 bg-white/10'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                            }`}
                            onClick={() => setLayoutMode(m.id)}
                          >
                            <span>{m.label}</span>
                            <span
                              className={`h-3 w-3 rounded-full border ${
                                layoutMode === m.id ? 'border-pink-400 bg-pink-400' : 'border-white/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Tiles</p>
                          <p className="text-[11px] text-gray-400">{maxTiles}</p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          Maximum tiles to display, depending on window size.
                        </p>
                        <div className="mt-2">
                          <Slider
                            min={4}
                            max={36}
                            step={1}
                            value={[maxTiles]}
                            onValueChange={(v) => setMaxTiles(v[0] ?? 16)}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">Hide tiles without video</p>
                        </div>
                        <Switch
                          checked={hideTilesWithoutVideo}
                          onCheckedChange={(v) => setHideTilesWithoutVideo(Boolean(v))}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full ${
                      blurEnabled ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    onClick={() => setBlurEnabled((v) => !v)}
                  >
                    <Droplets className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={showSidePane ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-9 w-9 rounded-full ${
                      showSidePane ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    onClick={() => setShowSidePane((v) => !v)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full ${
                      recording ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    onClick={() => setRecording((v) => !v)}
                  >
                    <CircleDot className="h-4 w-4" />
                  </Button>

                  <div className="mx-2 h-6 w-px bg-white/10" />

                  <span className="text-xs text-gray-400">
                    00:{t('saturno.live.timerSeconds', { defaultValue: '32' })}
                  </span>

                  <div className="mx-2 h-6 w-px bg-white/10" />

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-red-600 text-white hover:bg-red-500"
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-4 text-center text-xs text-gray-200">
                  {videoError}
                </div>
              )}
            </div>

            {/* Espaço reservado abaixo do vídeo (mantém respiro visual) */}
            <div className="h-8" />
          </div>

          {/* Painel lateral: participantes/chat (tabs) + resumo (mock) */}
          {showSidePane && (
            <aside className="hidden w-[22%] md:flex">
              {/* Wrapper com altura sincronizada com a janela de vídeo */}
              <div className="flex h-[calc(100vh-110px)] flex-1 min-h-0 flex-col gap-3">
                {/* Abas Chat / Participantes */}
                <div className="flex flex-1 min-h-0 flex-col rounded-3xl border border-white/10 bg-black/70">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs">
                    <p className="text-[11px] font-medium text-gray-300">
                      {t('saturno.live.detailsTitle', { defaultValue: 'Detalhes da reunião' })}
                    </p>
                    <span className="text-[11px] text-gray-500">
                      {t('saturno.live.participants', {
                        defaultValue: '{{count}} participantes',
                        count: participants.length,
                      })}
                    </span>
                  </div>

                  <div className="flex gap-1 px-3 pt-2 text-xs">
                    <button
                      type="button"
                      className={`flex-1 rounded-full py-1 text-[11px] font-medium ${
                        activeTab === 'chat' ? 'bg-white text-black' : 'bg-transparent text-gray-400'
                      }`}
                      onClick={() => setActiveTab('chat')}
                    >
                      {t('saturno.live.chatTab', { defaultValue: 'Chat' })}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-full py-1 text-[11px] font-medium ${
                        activeTab === 'participants' ? 'bg-white text-black' : 'bg-transparent text-gray-400'
                      }`}
                      onClick={() => setActiveTab('participants')}
                    >
                      {t('saturno.live.participantsTab', { defaultValue: 'Participantes' })}
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 px-4 pb-3 pt-2 text-xs text-gray-200">
                    {activeTab === 'chat' ? (
                      <div className="flex h-full min-h-0 flex-col space-y-3">
                        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
                          {messages.length === 0 ? (
                            <p className="mt-2 text-[11px] text-gray-500">
                              {t('saturno.live.chatPlaceholder', {
                                defaultValue: 'Nenhuma mensagem ainda. Digite algo para começar a conversa.',
                              })}
                            </p>
                          ) : (
                            messages.map((m) => (
                              <div
                                key={m.id}
                                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                                  m.isMe
                                    ? 'ml-auto bg-pink-600 text-right text-white'
                                    : 'bg-white/5 text-left text-gray-100'
                                }`}
                              >
                                <p className="text-[11px] text-white/80">{m.author}</p>
                                <p className="text-xs">{m.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="pt-1">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder={t('saturno.live.chatPlaceholder', {
                              defaultValue: 'Digite uma mensagem...',
                            })}
                            className="h-8 w-full rounded-full border border-white/10 bg-black/60 px-3 text-xs text-white placeholder:text-gray-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col space-y-2 overflow-y-auto pr-1 pt-1">
                        {participants.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-2xl bg-black/60 px-3 py-2 text-[11px] text-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px]">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="max-w-[120px] truncate">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {p.micMuted ? (
                                <MicOff className="h-3 w-3 text-red-400" />
                              ) : (
                                <Mic className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumo por IA (mock) */}
                <div className="mt-3 h-[120px] rounded-3xl border border-white/10 bg-black/70 px-4 py-3 text-xs text-gray-200">
                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-300">
                    <Sparkles className="h-4 w-4 text-pink-400" />
                    <span>
                      {t('saturno.live.aiSummaryTitle', {
                        defaultValue: 'Resumo inteligente (em breve)',
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {t('saturno.live.aiSummaryBody', {
                      defaultValue:
                        'Aqui você verá um resumo automático dos principais pontos da reunião, gerado pela IA da Saturno.',
                    })}
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </Layout>
  );
}