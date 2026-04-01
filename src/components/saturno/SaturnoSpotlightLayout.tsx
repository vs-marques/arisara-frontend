import React from 'react';
import { MicOff } from 'lucide-react';
import type { MeetParticipantView } from './saturnoMeetLiveModel';
import { primaryVideoTrack } from './saturnoMeetLiveModel';
import { VideoTrackView } from './VideoTrackView';
import { MicIconReactive } from './MicIconReactive';
import { ParticipantAvatar } from './SaturnoVideoGrid';

export interface SaturnoSpotlightLayoutProps {
  mainView: MeetParticipantView | null;
  shelfViews: MeetParticipantView[];
  localView?: MeetParticipantView;
  screenSharingLive: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  blurEnabled: boolean;
  liveMicLevel: number;
  mainParticipant: { name: string; isSpeaking: boolean };
  speakingLabel: string;
  sharingScreenLabel: string;
  showMainVideo: boolean;
}

export function SaturnoSpotlightLayout({
  mainView,
  shelfViews,
  localView,
  screenSharingLive,
  micEnabled,
  camEnabled,
  blurEnabled,
  liveMicLevel,
  mainParticipant,
  speakingLabel,
  sharingScreenLabel,
  showMainVideo,
}: SaturnoSpotlightLayoutProps) {
  return (
    <>
      {showMainVideo && mainView ? (
        <VideoTrackView
          track={primaryVideoTrack(mainView)}
          muted={mainView.isLocal}
          className={`h-full w-full object-cover ${blurEnabled ? 'blur-sm' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1625] via-[#0f0d15] to-[#0a0810]">
          <ParticipantAvatar name={mainParticipant.name} size="lg" />
        </div>
      )}

      <div className="absolute bottom-14 left-4 z-10 flex items-center gap-2">
        <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
          {screenSharingLive ? sharingScreenLabel : mainParticipant.name}
          {mainParticipant.isSpeaking && (
            <span className="ml-2 text-[10px] text-emerald-300">{speakingLabel}</span>
          )}
        </span>
      </div>

      {(shelfViews.length > 0 || (screenSharingLive && localView)) && (
        <div className="pointer-events-none absolute inset-y-3 right-3 z-10 hidden w-48 flex-col gap-2 overflow-y-auto md:flex lg:w-56">
          {screenSharingLive && localView && (
            <ShelfTile
              view={localView}
              isLocal
              micEnabled={micEnabled}
              camEnabled={camEnabled}
              blurEnabled={blurEnabled}
              liveMicLevel={liveMicLevel}
              pipCameraOnly
              displayName={mainParticipant.name}
            />
          )}
          {shelfViews.map((p) => (
            <ShelfTile
              key={p.sid}
              view={p}
              isLocal={p.isLocal}
              micEnabled={micEnabled}
              camEnabled={camEnabled}
              blurEnabled={blurEnabled}
              liveMicLevel={liveMicLevel}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ShelfTile({
  view,
  isLocal,
  micEnabled,
  camEnabled,
  blurEnabled,
  liveMicLevel,
  pipCameraOnly,
  displayName,
}: {
  view: MeetParticipantView;
  isLocal: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  blurEnabled: boolean;
  liveMicLevel: number;
  pipCameraOnly?: boolean;
  displayName?: string;
}) {
  const vt = pipCameraOnly
    ? camEnabled
      ? view.cameraTrack
      : undefined
    : primaryVideoTrack(view);
  const name = displayName ?? view.name;

  return (
    <div
      className={`pointer-events-auto relative flex-none overflow-hidden rounded-xl transition-shadow duration-200 ${
        view.isSpeaking
          ? 'shadow-[0_0_12px_rgba(52,211,153,0.12)] ring-2 ring-emerald-400/50'
          : 'ring-1 ring-white/[0.08]'
      }`}
      style={{ aspectRatio: '16/9' }}
    >
      <div className="absolute inset-0">
        {vt ? (
          <VideoTrackView
            track={vt}
            muted={isLocal}
            className={`h-full w-full object-cover ${blurEnabled ? 'blur-sm' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1625] via-[#0f0d15] to-[#0a0810]">
            <ParticipantAvatar name={name} size="sm" />
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
        <span className="truncate rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
          {name}
        </span>
        <span className="flex items-center rounded-md bg-black/50 px-1 py-0.5 backdrop-blur-sm">
          {view.micMuted ? (
            <MicOff className="h-2.5 w-2.5 text-red-400" />
          ) : isLocal ? (
            <MicIconReactive
              muted={!micEnabled}
              audioLevel={liveMicLevel}
              iconClassName="h-2.5 w-2.5"
              activeClassName="text-white/80"
            />
          ) : (
            <MicIconReactive
              muted={false}
              isSpeaking={view.isSpeaking}
              iconClassName="h-2.5 w-2.5"
              activeClassName="text-white/80"
            />
          )}
        </span>
      </div>
    </div>
  );
}
