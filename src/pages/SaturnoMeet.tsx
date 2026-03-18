import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Mic, MicOff, Video, VideoOff, Sparkles, Droplets } from 'lucide-react';
import { getMyProfile } from '../services/profileService';

export default function SaturnoMeetPrejoin() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [blurBackground, setBlurBackground] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string | undefined>(undefined);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | undefined>(undefined);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string>('You');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        if (profile.name) {
          setDisplayName(profile.name);
        } else if (profile.username) {
          setDisplayName(profile.username);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audIn = devices.filter((d) => d.kind === 'audioinput');
      const audOut = devices.filter((d) => d.kind === 'audiooutput');
      const vidIn = devices.filter((d) => d.kind === 'videoinput');
      setAudioInputs(audIn);
      setAudioOutputs(audOut);
      setVideoInputs(vidIn);
      if (!selectedMic && audIn[0]) setSelectedMic(audIn[0].deviceId);
      if (!selectedSpeaker && audOut[0]) setSelectedSpeaker(audOut[0].deviceId);
      if (!selectedCamera && vidIn[0]) setSelectedCamera(vidIn[0].deviceId);
    };

    loadDevices().catch(() => {});
  }, [selectedMic, selectedSpeaker, selectedCamera]);

  useEffect(() => {
    const startVideo = async () => {
      if (!camEnabled) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      try {
        setVideoError(null);
        const constraints: MediaStreamConstraints = {
          video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
          audio: micEnabled
            ? selectedMic
              ? { deviceId: { exact: selectedMic } }
              : true
            : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setVideoError(
          t('saturno.prejoin.videoError', {
            defaultValue: 'Could not access your camera or microphone.',
          })
        );
      }
    };

    if (navigator.mediaDevices?.getUserMedia) {
      startVideo();
    } else {
      setVideoError(
        t('saturno.prejoin.videoUnsupported', {
          defaultValue: 'Your browser does not support camera access.',
        })
      );
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [camEnabled, micEnabled, selectedCamera, selectedMic, t]);

  const handleJoin = () => {
    navigate(`/saturno/meet/${code}/live`);
  };

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl space-y-8">
          <div className="text-left space-y-2">
            <h1 className="text-2xl font-semibold text-white">
              {t('saturno.prejoin.title', { defaultValue: 'Set up audio and video' })}
            </h1>
            <p className="text-sm text-gray-400">
              {t('saturno.prejoin.subtitle', {
                defaultValue: 'Review your settings before joining the meeting.',
              })}
            </p>
            {code && (
              <p className="mt-1 text-xs text-gray-500">
                {t('saturno.prejoin.meetingCode', {
                  defaultValue: 'Meeting code: {{code}}',
                  code,
                })}
              </p>
            )}
          </div>

          <div className="mx-auto flex w-full flex-col gap-8 md:flex-row">
            <div className="flex-1 space-y-4">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60">
                <video
                  ref={videoRef}
                  className={`h-64 w-full rounded-3xl object-cover ${
                    blurBackground ? 'blur-sm' : ''
                  }`}
                  muted
                  autoPlay
                  playsInline
                />
                <div className="pointer-events-none absolute left-4 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {displayName}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                  <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setMicEnabled((v) => !v)}
                      className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      aria-label={
                        micEnabled
                          ? t('saturno.prejoin.micOn', { defaultValue: 'Audio on' })
                          : t('saturno.prejoin.micOff', { defaultValue: 'Audio off' })
                      }
                    >
                      {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCamEnabled((v) => !v)}
                      className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      aria-label={
                        camEnabled
                          ? t('saturno.prejoin.cameraOn', { defaultValue: 'Video on' })
                          : t('saturno.prejoin.cameraOff', { defaultValue: 'Video off' })
                      }
                    >
                      {camEnabled ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <VideoOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlurBackground((v) => !v)}
                      className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      aria-label={t('saturno.prejoin.blur', {
                        defaultValue: 'Blur background',
                      })}
                    >
                      <Droplets className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {videoError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-4 text-center text-xs text-gray-300">
                    {videoError}
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-gray-300">
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                      {t('saturno.prejoin.micSelect', { defaultValue: 'Microphone' })}
                    </p>
                    <select
                      value={selectedMic ?? ''}
                      onChange={(e) => setSelectedMic(e.target.value || undefined)}
                      className="h-8 w-full rounded-full border border-white/15 bg-black/70 px-3 text-xs text-white"
                    >
                      {audioInputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || t('saturno.prejoin.defaultDevice', { defaultValue: 'Default' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                      {t('saturno.prejoin.speakerSelect', { defaultValue: 'Speaker' })}
                    </p>
                    <select
                      value={selectedSpeaker ?? ''}
                      onChange={(e) => setSelectedSpeaker(e.target.value || undefined)}
                      className="h-8 w-full rounded-full border border-white/15 bg-black/70 px-3 text-xs text-white"
                    >
                      {audioOutputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || t('saturno.prejoin.defaultDevice', { defaultValue: 'Default' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                      {t('saturno.prejoin.cameraSelect', { defaultValue: 'Camera' })}
                    </p>
                    <select
                      value={selectedCamera ?? ''}
                      onChange={(e) => setSelectedCamera(e.target.value || undefined)}
                      className="h-8 w-full rounded-full border border-white/15 bg-black/70 px-3 text-xs text-white"
                    >
                      {videoInputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || t('saturno.prejoin.defaultDevice', { defaultValue: 'Default' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                      {t('saturno.prejoin.backgroundSelect', {
                        defaultValue: 'Background (coming soon)',
                      })}
                    </p>
                    <select
                      disabled
                      className="h-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-black/40 px-3 text-xs text-gray-500"
                    >
                      <option>
                        {t('saturno.prejoin.backgroundDisabled', {
                          defaultValue: 'Background options coming soon',
                        })}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-black/70 px-6 py-6">
              <h2 className="text-lg font-semibold text-white">
                {t('saturno.prejoin.readyTitle', { defaultValue: 'Ready to join?' })}
              </h2>
              <p className="text-xs text-gray-400">
                {t('saturno.prejoin.scheduledFor', {
                  defaultValue: 'Scheduled for this time',
                })}
              </p>

              <button
                type="button"
                disabled
                className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left text-xs text-gray-300"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/80 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">
                    {t('saturno.prejoin.notesTitle', {
                      defaultValue: 'Use assistant for notes',
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {t('saturno.prejoin.notesSubtitle', {
                      defaultValue: 'Coming soon: generate automatic meeting notes with LLM.',
                    })}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-pink-300">
                  {t('saturno.prejoin.notesStartLabel', { defaultValue: 'COMING SOON' })}
                </span>
              </button>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleJoin}
                  className="h-11 w-full rounded-full bg-pink-500 text-sm font-medium text-white hover:bg-pink-400"
                >
                  {t('saturno.prejoin.joinNow', { defaultValue: 'Join meeting' })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

