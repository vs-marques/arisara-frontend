import type { Participant, Room, VideoTrack } from 'livekit-client';
import { Track } from 'livekit-client';

export interface MeetParticipantView {
  sid: string;
  identity: string;
  name: string;
  isLocal: boolean;
  cameraTrack?: VideoTrack;
  screenTrack?: VideoTrack;
  micMuted: boolean;
  isSpeaking: boolean;
}

function tracksFromParticipant(p: Participant): { camera?: VideoTrack; screen?: VideoTrack } {
  const camPub = p.getTrackPublication(Track.Source.Camera);
  const scrPub = p.getTrackPublication(Track.Source.ScreenShare);
  return {
    camera: (camPub?.track as VideoTrack | undefined) ?? undefined,
    screen: (scrPub?.track as VideoTrack | undefined) ?? undefined,
  };
}

export function buildMeetParticipants(room: Room): MeetParticipantView[] {
  const out: MeetParticipantView[] = [];

  const push = (p: Participant, isLocal: boolean) => {
    const { camera, screen } = tracksFromParticipant(p);
    out.push({
      sid: p.sid,
      identity: p.identity,
      name: (p.name && p.name.trim()) || p.identity || 'Participante',
      isLocal,
      cameraTrack: camera,
      screenTrack: screen,
      micMuted: !p.isMicrophoneEnabled,
      isSpeaking: p.isSpeaking,
    });
  };

  push(room.localParticipant, true);
  room.remoteParticipants.forEach((rp) => push(rp, false));
  return out;
}

export function primaryVideoTrack(v: MeetParticipantView): VideoTrack | undefined {
  return v.screenTrack || v.cameraTrack;
}
