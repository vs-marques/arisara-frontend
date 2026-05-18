import { ExternalLink, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ArisaraSwitch } from '@/components/ui/nyoka-switch';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { cn } from '@/lib/utils';
import type { ConnectionItem } from '@/types/channels';

function isWhatsAppChannel(channelType: string): boolean {
  return channelType.toLowerCase().includes('whatsapp');
}

interface ConnectionCardProps {
  connection: ConnectionItem;
  onManage: (connection: ConnectionItem) => void;
  onToggle?: (connection: ConnectionItem, enabled: boolean) => void;
}

const providerIconClass: Record<string, string> = {
  evolution: 'bg-emerald-500/15 text-emerald-400',
  twilio: 'bg-red-500/15 text-red-300',
  meta: 'bg-blue-500/15 text-blue-300',
  instagram: 'bg-pink-500/15 text-pink-300',
  webchat: 'bg-violet-500/15 text-violet-300',
};

function StatusDot({ status }: { status: ConnectionItem['status'] }) {
  const { t } = useTranslation();
  const connected = status === 'connected';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          connected ? 'bg-emerald-400' : status === 'pending' ? 'bg-amber-400' : 'bg-gray-500'
        )}
      />
      {connected
        ? t('channels.statusConnected')
        : status === 'pending'
          ? t('channels.statusPending')
          : t('channels.statusDraft')}
    </span>
  );
}

export default function ConnectionCard({
  connection,
  onManage,
  onToggle,
}: ConnectionCardProps) {
  const { t } = useTranslation();
  const iconClass = providerIconClass[connection.provider] ?? 'bg-white/10 text-white/70';

  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <StatusDot status={connection.status} />
        {connection.docUrl ? (
          <a
            href={connection.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-[55%] items-center gap-1 truncate text-xs text-white/40 hover:text-pink-400"
          >
            <span className="truncate">{connection.docUrl.replace(/^https?:\/\//, '')}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : null}
      </div>

      <div className="mb-4 flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            isWhatsAppChannel(connection.channelType)
              ? 'bg-[#25D366]/15 text-[#25D366]'
              : cn('text-lg font-bold', iconClass)
          )}
        >
          {isWhatsAppChannel(connection.channelType) ? (
            <WhatsAppIcon size={28} />
          ) : (
            connection.channelType.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{connection.providerLabel}</h3>
          <p className="text-sm text-white/50">{connection.channelType}</p>
        </div>
      </div>

      <p className="mb-1 truncate text-sm font-semibold text-white">{connection.instanceName}</p>
      {connection.phoneNumber && (
        <p className="mb-2 truncate text-xs text-white/45">{connection.phoneNumber}</p>
      )}
      <p className="mb-5 line-clamp-3 flex-1 text-sm leading-relaxed text-white/55">
        {connection.description}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onManage(connection)}
          className="rounded-xl border-white/15 bg-transparent text-white/80 hover:border-pink-500/40 hover:bg-white/[0.04] hover:text-white"
        >
          <Settings className="mr-2 h-4 w-4" />
          {t('channels.connections.manage')}
        </Button>
        <ArisaraSwitch
          checked={connection.enabled}
          disabled={!onToggle}
          onCheckedChange={(checked) => onToggle?.(connection, checked)}
        />
      </div>
    </article>
  );
}
