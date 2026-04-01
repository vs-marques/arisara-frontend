import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import FloatingLanguageSelector from '@/components/FloatingLanguageSelector';
import { API_BASE_URL } from '@/config/api';
import { saturnoMeetLobbyPath } from '@/utils/saturnoMeetPaths';
import { useButtonRipple } from '@/utils/buttonRipple';
import { Shield } from 'lucide-react';

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://arisara.ai';
const REDIRECT_SECONDS = 30;

export type SaturnoMeetThanksState = {
  roomPublicId?: string;
  joinFromUrl?: string | null;
};

function CountdownRing({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, secondsLeft / total));
  const dashOffset = c * (1 - progress);

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" className="stroke-white/15" strokeWidth="3" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="#ec4899"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 22 22)"
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
      <text
        x="22"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white text-[11px] font-semibold tabular-nums"
      >
        {secondsLeft}
      </text>
    </svg>
  );
}

export default function SaturnoMeetThanks() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as SaturnoMeetThanksState | null) ?? null;

  const roomPublicId = state?.roomPublicId?.trim() || '';
  const joinFromUrl = state?.joinFromUrl ?? null;

  const legalBaseUrl = API_BASE_URL.replace(/\/$/, '');
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backRipple = useButtonRipple();
  const goToSiteRipple = useButtonRipple();

  const clearRedirectTimer = () => {
    if (timerIdRef.current != null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  const goToLanding = () => {
    clearRedirectTimer();
    window.location.assign(LANDING_URL);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          timerIdRef.current = null;
          window.location.assign(LANDING_URL);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    timerIdRef.current = id;
    return () => {
      clearInterval(id);
      timerIdRef.current = null;
    };
  }, []);

  const handleBackToMeeting = () => {
    clearRedirectTimer();
    if (!roomPublicId) return;
    const q = joinFromUrl ? `?join=${encodeURIComponent(joinFromUrl)}` : '';
    navigate(`${saturnoMeetLobbyPath(roomPublicId)}${q}`, { replace: true });
  };

  return (
    <div className="relative min-h-screen bg-[#05030a] text-white">
      <FloatingLanguageSelector />

      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-32 pt-10 sm:px-8 sm:pt-14">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
          {t('saturno.meetThanks.title', { defaultValue: 'Thanks for joining' })}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-center text-[15px] leading-relaxed text-gray-400">
          {t('saturno.meetThanks.body', {
            defaultValue:
              'Thanks for being part of this meeting. Come back anytime.',
          })}
        </p>

        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {roomPublicId ? (
            <Button
              ref={backRipple.ref}
              type="button"
              variant="outline"
              onClick={handleBackToMeeting}
              onMouseEnter={backRipple.onMouseEnter}
              className="relative h-12 flex-1 overflow-hidden rounded-2xl border-white/15 bg-black/50 text-white shadow-sm hover:bg-white/10 hover:text-white sm:max-w-[220px]"
            >
              {t('saturno.meetThanks.backToMeeting', { defaultValue: 'Rejoin meeting' })}
            </Button>
          ) : null}
          <Button
            ref={goToSiteRipple.ref}
            type="button"
            onClick={goToLanding}
            onMouseEnter={goToSiteRipple.onMouseEnter}
            className="relative h-12 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] text-sm font-medium text-white transition-all duration-300 hover:border-[#EC4899] hover:bg-[#EC4899] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.6)] sm:max-w-[220px]"
          >
            {t('saturno.meetThanks.goToSite', { defaultValue: 'Go to website' })}
          </Button>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-black/70 p-4 backdrop-blur-sm sm:p-5">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-pink-400">
              <Shield className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white">
                {t('saturno.meetThanks.securityTitle', {
                  defaultValue: 'Your meeting is protected',
                })}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                {t('saturno.meetThanks.securityBody', {
                  defaultValue:
                    'Only people with the link or authorized access can join. Media is sent over secure channels, in line with our Privacy Policy.',
                })}
              </p>
              <a
                href={`${legalBaseUrl}/privacy`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-pink-400 hover:text-pink-300"
              >
                {t('saturno.meetThanks.securityLearnMore', { defaultValue: 'Learn more' })}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-sm text-gray-400">
          <CountdownRing secondsLeft={secondsLeft} total={REDIRECT_SECONDS} />
          <p className="max-w-xs leading-snug sm:max-w-md">
            {t('saturno.meetThanks.redirectHint', {
              defaultValue: "You'll be taken to Arisara's website in a moment.",
            })}
          </p>
        </div>
      </div>

      <footer className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/60 px-4 py-4 backdrop-blur-md sm:py-5">
        <p className="pointer-events-auto mx-auto max-w-lg text-center text-[11px] leading-relaxed text-gray-500 sm:text-xs">
          <span className="block sm:mb-0 sm:inline">{t('login.legal.line')}</span>{' '}
          <span className="inline-flex flex-wrap items-center justify-center gap-x-0.5 gap-y-1 sm:inline">
            <a
              href={`${legalBaseUrl}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 underline decoration-white/15 underline-offset-[3px] transition-colors hover:text-pink-400"
            >
              {t('login.legal.terms')}
            </a>
            <span className="text-gray-600"> {t('login.legal.and')} </span>
            <a
              href={`${legalBaseUrl}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 underline decoration-white/15 underline-offset-[3px] transition-colors hover:text-pink-400"
            >
              {t('login.legal.privacy')}
            </a>
          </span>
        </p>
      </footer>
    </div>
  );
}
