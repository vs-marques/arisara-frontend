import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Globe, Instagram, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MetaIcon } from '@/components/icons/MetaIcon';
import { TwilioIcon } from '@/components/icons/TwilioIcon';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { cn } from '@/lib/utils';
import type { ConnectionProvider } from '@/types/channels';

export type ChannelCategory = 'whatsapp' | 'instagram' | 'facebook' | 'voice' | 'web';

interface CreateConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProvider: (provider: ConnectionProvider) => void;
  onComingSoon: () => void;
}

const CATEGORIES: ChannelCategory[] = ['whatsapp', 'instagram', 'facebook', 'voice', 'web'];

interface ProviderOption {
  id: string;
  provider?: ConnectionProvider;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  available: boolean;
}

function getWhatsAppProviders(): ProviderOption[] {
  return [
    {
      id: 'evolution',
      provider: 'evolution',
      titleKey: 'channels.create.providers.evolution.title',
      descriptionKey: 'channels.create.providers.evolution.description',
      icon: (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
          <WhatsAppIcon size={24} />
        </span>
      ),
      available: true,
    },
    {
      id: 'meta-waba',
      provider: 'meta',
      titleKey: 'channels.create.providers.metaCloud.title',
      descriptionKey: 'channels.create.providers.metaCloud.description',
      icon: (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0866FF]/15 text-[#0866FF]">
          <MetaIcon size={28} />
        </span>
      ),
      available: false,
    },
    {
      id: 'twilio',
      provider: 'twilio',
      titleKey: 'channels.create.providers.twilio.title',
      descriptionKey: 'channels.create.providers.twilio.description',
      icon: (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F22F46]/15 text-[#F22F46]">
          <TwilioIcon size={26} />
        </span>
      ),
      available: false,
    },
  ];
}

export default function CreateConnectionDialog({
  open,
  onOpenChange,
  onSelectProvider,
  onComingSoon,
}: CreateConnectionDialogProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<ChannelCategory>('whatsapp');

  const handleOpenChange = (next: boolean) => {
    if (next) setCategory('whatsapp');
    onOpenChange(next);
  };

  const handleOptionClick = (option: ProviderOption) => {
    if (!option.available || !option.provider) {
      onComingSoon();
      return;
    }
    onOpenChange(false);
    onSelectProvider(option.provider);
  };

  const whatsappProviders = getWhatsAppProviders();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden border-white/10 bg-[#0c0c0c] p-0 text-white">
        <div className="flex min-h-[420px] flex-col sm:flex-row">
          <aside className="shrink-0 border-b border-white/10 bg-zinc-950/80 sm:w-52 sm:border-b-0 sm:border-r">
            <nav className="flex gap-1 overflow-x-auto p-2 sm:flex-col sm:overflow-visible sm:p-3">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors sm:w-full',
                      active
                        ? 'bg-pink-500/15 text-pink-300'
                        : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                    )}
                  >
                    <CategoryIcon category={cat} active={active} />
                    {t(`channels.create.categories.${cat}`)}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <DialogHeader className="space-y-1 border-b border-white/10 px-6 py-5 text-left">
              <DialogTitle className="text-xl font-semibold text-white">
                {t(`channels.create.categories.${category}`)}
              </DialogTitle>
              <DialogDescription className="text-sm text-white/50">
                {t(`channels.create.categorySubtitle.${category}`)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {category === 'whatsapp' ? (
                <ul className="space-y-3">
                  {whatsappProviders.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => handleOptionClick(option)}
                        className={cn(
                          'flex w-full gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all',
                          option.available
                            ? 'hover:border-pink-500/40 hover:bg-white/[0.04]'
                            : 'cursor-default opacity-75 hover:border-white/15'
                        )}
                      >
                        {option.icon}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{t(option.titleKey)}</p>
                          <p className="mt-1 text-sm leading-relaxed text-white/50">
                            {t(option.descriptionKey)}
                          </p>
                          {!option.available && (
                            <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
                              {t('channels.inDevelopment')}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 py-16 text-center">
                  <CategoryIcon category={category} active large />
                  <p className="mt-4 text-sm font-medium text-white/70">
                    {t('channels.create.comingSoonTitle')}
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-white/45">
                    {t('channels.create.comingSoonDescription', {
                      channel: t(`channels.create.categories.${category}`),
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryIcon({
  category,
  active,
  large,
}: {
  category: ChannelCategory;
  active?: boolean;
  large?: boolean;
}) {
  const cls = cn('shrink-0', large ? 'h-10 w-10' : 'h-4 w-4', active && !large && 'text-pink-400');
  switch (category) {
    case 'whatsapp':
      return <WhatsAppIcon size={large ? 28 : 16} className={cn(active && !large && 'text-pink-400')} />;
    case 'instagram':
      return <Instagram className={cls} />;
    case 'facebook':
      return <Facebook className={cls} />;
    case 'voice':
      return <Phone className={cls} />;
    case 'web':
      return <Globe className={cls} />;
    default:
      return null;
  }
}
