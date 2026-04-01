import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MicOff } from 'lucide-react';
import type { MeetParticipantView } from './saturnoMeetLiveModel';
import { primaryVideoTrack } from './saturnoMeetLiveModel';
import { VideoTrackView } from './VideoTrackView';
import { MicIconReactive } from './MicIconReactive';

export interface SaturnoVideoGridProps {
  views: MeetParticipantView[];
  maxTiles: number;
  blurEnabled: boolean;
  liveMicLevel: number;
  micEnabled: boolean;
  /** Ex.: t('saturno.live.you') — omitir para não mostrar sufixo */
  youLabel?: string;
}

/**
 * Escolhe cols × rows pelo maior "tile 16:9" que cabe no retângulo (só para decidir layout).
 * Com áreas parecidas (±5%), prefere grade mais **quadrada** (|cols−rows| menor), estilo Meet.
 * O desenho real dos quadros é `minmax(0,1fr)` — preenche o container; vídeo com object-cover.
 */
function computeOptimalGrid(
  count: number,
  containerW: number,
  containerH: number,
  gap: number = 8,
  aspect: number = 16 / 9,
): { cols: number; rows: number } {
  if (!count || containerW <= 0 || containerH <= 0) {
    return { cols: 1, rows: 1 };
  }

  let bestCols = 1;
  let bestRows = Math.ceil(count / 1);
  let bestArea = 0;

  const maxCols = Math.min(count, 8);
  for (let cols = 1; cols <= maxCols; cols++) {
    const rows = Math.ceil(count / cols);
    const availW = containerW - gap * (cols - 1);
    const availH = containerH - gap * (rows - 1);
    if (availW <= 0 || availH <= 0) continue;

    const tileWFromCols = availW / cols;
    const tileHFromW = tileWFromCols / aspect;
    const tileHFromRows = availH / rows;
    const finalTileH = Math.min(tileHFromW, tileHFromRows);
    const finalTileW = finalTileH * aspect;
    if (finalTileW <= 0 || finalTileH <= 0) continue;

    const area = finalTileW * finalTileH;
    const isSignificantlyBetter = area > bestArea * 1.05;
    const isSimilarArea = area >= bestArea * 0.95;
    const currentSquareness = Math.abs(cols - rows);
    const bestSquareness = Math.abs(bestCols - bestRows);
    const moreBalanced = currentSquareness < bestSquareness;

    if (isSignificantlyBetter || (isSimilarArea && moreBalanced)) {
      bestCols = cols;
      bestRows = rows;
      bestArea = area;
    }
  }

  if (bestArea === 0) {
    return { cols: 1, rows: Math.ceil(count / 1) };
  }
  return { cols: bestCols, rows: bestRows };
}

export function ParticipantAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-14 w-14 text-lg',
    lg: 'h-20 w-20 text-2xl',
  };
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ${sizeMap[size]}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${(hue + 40) % 360}, 50%, 35%))`,
        boxShadow: `0 0 24px hsla(${hue}, 60%, 45%, 0.3)`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function SaturnoVideoGrid({
  views,
  maxTiles,
  blurEnabled,
  liveMicLevel,
  micEnabled,
  youLabel,
}: SaturnoVideoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = useMemo(() => views.slice(0, Math.max(1, maxTiles)), [views, maxTiles]);
  const grid = useMemo(
    () => computeOptimalGrid(visible.length, size.width, size.height, 8),
    [visible.length, size.width, size.height],
  );

  const gapPx = 8;
  /** contentRect já é a área útil (sem padding do ref); só desconta gaps entre células */
  const approxCellShort =
    grid.rows > 0 && grid.cols > 0 && size.width > 0 && size.height > 0
      ? Math.min(
          (size.width - gapPx * Math.max(0, grid.cols - 1)) / grid.cols,
          (size.height - gapPx * Math.max(0, grid.rows - 1)) / grid.rows,
        )
      : 120;
  const avatarSize: 'sm' | 'md' | 'lg' =
    approxCellShort > 200 ? 'lg' : approxCellShort > 120 ? 'md' : 'sm';

  /** Última linha incompleta: desloca colunas para centralizar o bloco (estilo Meet). */
  const cellPlacements = useMemo(() => {
    const count = visible.length;
    const cols = grid.cols;
    if (count < 1 || cols < 1) return [] as { row: number; col: number }[];

    const itemsInLastRow = count % cols === 0 ? cols : count % cols;
    const lastRowStart = count - itemsInLastRow;
    const centerLastRow = itemsInLastRow > 0 && itemsInLastRow < cols;
    const colStartLast = 1 + Math.floor((cols - itemsInLastRow) / 2);

    return visible.map((_, i) => {
      const row = Math.floor(i / cols) + 1;
      const col =
        centerLastRow && i >= lastRowStart ? colStartLast + (i - lastRowStart) : (i % cols) + 1;
      return { row, col };
    });
  }, [visible, grid.cols]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none box-border h-full min-h-0 w-full min-w-0 p-2"
    >
      <div
        className="pointer-events-none grid h-full min-h-0 w-full min-w-0 gap-2"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
        }}
      >
        {visible.map((v, i) => {
          const vt = primaryVideoTrack(v);
          const place = cellPlacements[i];
          return (
            <div
              key={v.sid}
              className={`pointer-events-auto group relative min-h-0 min-w-0 overflow-hidden rounded-xl transition-shadow duration-200 ${
                v.isSpeaking
                  ? 'shadow-[0_0_16px_rgba(52,211,153,0.15)] ring-2 ring-emerald-400/60'
                  : 'ring-1 ring-white/[0.08]'
              }`}
              style={
                place
                  ? { gridRow: place.row, gridColumn: place.col }
                  : undefined
              }
            >
              <div className="absolute inset-0">
                {vt ? (
                  <VideoTrackView
                    track={vt}
                    muted={v.isLocal}
                    className={`h-full w-full object-cover ${blurEnabled ? 'blur-sm' : ''}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1625] via-[#0f0d15] to-[#0a0810]">
                    <ParticipantAvatar name={v.name} size={avatarSize} />
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5 pt-8 transition-opacity duration-150">
                <span className="max-w-[min(100%,12rem)] truncate rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  {v.name}
                  {v.isLocal && youLabel ? (
                    <span className="text-[9px] text-white/50"> {youLabel}</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center rounded-md bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
                  {v.micMuted ? (
                    <MicOff className="h-3 w-3 text-red-400" />
                  ) : v.isLocal ? (
                    <MicIconReactive
                      muted={!micEnabled}
                      audioLevel={liveMicLevel}
                      iconClassName="h-3 w-3"
                      activeClassName="text-white/80"
                    />
                  ) : (
                    <MicIconReactive
                      muted={false}
                      isSpeaking={v.isSpeaking}
                      iconClassName="h-3 w-3"
                      activeClassName="text-white/80"
                    />
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
