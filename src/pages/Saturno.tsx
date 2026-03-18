import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

interface UpcomingMeeting {
  id: string;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  saturnoMeetUrl: string;
  source: 'agenda' | 'instant' | string;
  description?: string | null;
}

export default function Saturno() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [joinCode, setJoinCode] = useState('');
  const [upcoming, setUpcoming] = useState<UpcomingMeeting[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  const handleCreateInstantRoom = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.saturno.instantMeet(), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { saturnoMeetUrl: string };
      const code = data.saturnoMeetUrl.split('/').pop() ?? '';
      if (code) {
        navigate(`/saturno/meet/${code}`);
      }
    } catch {
      // Silencia por enquanto; futuramente podemos exibir toast de erro.
    }
  };

  const handleJoin = () => {
    const trimmed = joinCode.trim();
    if (!trimmed) return;
    navigate(`/saturno/meet/${trimmed}`);
  };

  useEffect(() => {
    const loadUpcoming = async () => {
      setLoadingUpcoming(true);
      try {
        const res = await fetch(API_ENDPOINTS.saturno.upcomingMeetings(), {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          setUpcoming([]);
          return;
        }
        const data = (await res.json()) as UpcomingMeeting[];
        setUpcoming(Array.isArray(data) ? data : []);
      } catch {
        setUpcoming([]);
      } finally {
        setLoadingUpcoming(false);
      }
    };
    loadUpcoming();
  }, []);

  const formatTimeRange = (start?: string | null, end?: string | null) => {
    if (!start) return '';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const opts: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    const startStr = startDate.toLocaleString('pt-BR', opts);
    if (!endDate) return startStr;
    const endStr = endDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${startStr} – ${endStr}`;
  };

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl space-y-10">
          <div className="text-center space-y-0">
            <div className="mx-auto flex justify-center">
              <img
                src="https://res.cloudinary.com/dtijk612b/image/upload/v1773752586/logo_saturno_yz96ew.png"
                alt="Saturno"
                className="h-40"
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-white">
                {t('saturno.lobby.title', {
                  defaultValue: 'Secure video conferencing for everyone',
                })}
              </h1>
              <p className="text-sm text-gray-400">
                {t('saturno.lobby.subtitle', {
                  defaultValue:
                    'Connect, collaborate, and celebrate from anywhere with Saturno Meet.',
                })}
              </p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                onClick={handleCreateInstantRoom}
                className="h-11 rounded-full bg-pink-500 px-6 text-sm font-medium text-white hover:bg-pink-400 sm:w-auto"
              >
                {t('saturno.lobby.newRoom', { defaultValue: 'New meeting' })}
              </Button>
              <div className="flex w-full items-center gap-3">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder={t('saturno.lobby.codePlaceholder', {
                    defaultValue: 'Enter a code or link',
                  })}
                  className="h-11 flex-1 rounded-full border-white/15 bg-black/60 text-sm text-white placeholder:text-gray-500"
                />
                <Button
                  type="button"
                  onClick={handleJoin}
                  disabled={!joinCode.trim()}
                  className="h-11 rounded-full px-6 text-sm font-medium disabled:cursor-not-allowed"
                >
                  {t('saturno.lobby.join', { defaultValue: 'Join' })}
                </Button>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-3">
            <h2 className="text-sm font-medium text-gray-300">
              {t('saturno.lobby.upcomingTitle', {
                defaultValue: 'Upcoming Saturno meetings',
              })}
            </h2>
            <div className="space-y-2">
              {loadingUpcoming ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                  <p className="text-sm text-gray-500">
                    {t('saturno.lobby.upcomingLoading', {
                      defaultValue: 'Loading Saturno meetings...',
                    })}
                  </p>
                </div>
              ) : upcoming.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                  <p className="text-sm text-gray-500">
                    {t('saturno.lobby.upcomingEmpty', {
                      defaultValue: 'No Saturno meetings scheduled right now.',
                    })}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((m) => (
                    <li
                      key={m.id}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 transition-colors hover:bg-white/5"
                      onClick={() => {
                        const code = m.saturnoMeetUrl.split('/').pop() ?? '';
                        if (code) navigate(`/saturno/meet/${code}`);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {m.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatTimeRange(m.startAt, m.endAt)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {m.source === 'agenda'
                            ? t('saturno.lobby.originAgenda', {
                                defaultValue: 'Scheduled via Nyoka Agenda',
                              })
                            : t('saturno.lobby.originInstant', {
                                defaultValue: 'Instant Saturno room',
                              })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {t('saturno.lobby.footer', {
                defaultValue:
                  'These meetings come from your Nyoka Agenda and recently created Saturno rooms for your company.',
              })}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

