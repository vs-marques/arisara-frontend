import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateConnectionDialog from '@/components/channels/CreateConnectionDialog';
import { useToast } from '@/hooks/use-toast';
import type { UseConnectionsResult } from '@/hooks/useConnections';
import ConnectionCard from '@/components/channels/ConnectionCard';
import EvolutionAPIConfig from '@/components/EvolutionAPIConfig';
import type { ConnectionItem, ConnectionProvider } from '@/types/channels';

interface ChannelsConnectionsSectionProps {
  connectionsHook: UseConnectionsResult;
}

export default function ChannelsConnectionsSection({
  connectionsHook,
}: ChannelsConnectionsSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { connections, totalCount, loading, search, setSearch, reload } = connectionsHook;

  const [createOpen, setCreateOpen] = useState(false);
  const [manageConnection, setManageConnection] = useState<ConnectionItem | null>(null);

  const handleCreateProvider = (provider: ConnectionProvider) => {
    setCreateOpen(false);
    if (provider === 'evolution') {
      setManageConnection({
        id: 'new-evolution',
        provider: 'evolution',
        providerLabel: 'Evolution API',
        channelType: 'WhatsApp',
        instanceName: '',
        description: '',
        status: 'pending',
        enabled: false,
      });
      return;
    }
    toast({
      title: t('channels.inDevelopment'),
      description: t('channels.connections.providerSoon'),
    });
  };

  const handleToggle = (_connection: ConnectionItem, _enabled: boolean) => {
    toast({
      title: t('channels.connections.toggleSoon'),
      description: t('channels.connections.toggleSoonDescription'),
    });
  };

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('channels.connections.searchPlaceholder')}
              className="rounded-xl border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-white/40"
            />
          </div>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 text-white hover:shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('channels.connections.create')}
          </Button>
        </div>

        <p className="text-sm text-white/45">
          {t('channels.connections.results', { count: connections.length, total: totalCount })}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center">
            <p className="text-white/70">{t('channels.connections.emptyTitle')}</p>
            <p className="mt-2 text-sm text-white/45">{t('channels.connections.emptyDescription')}</p>
            <Button
              type="button"
              className="mt-6 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('channels.connections.create')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onManage={setManageConnection}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </section>

      <CreateConnectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSelectProvider={handleCreateProvider}
        onComingSoon={() =>
          toast({
            title: t('channels.inDevelopment'),
            description: t('channels.connections.providerSoon'),
          })
        }
      />

      <Dialog
        open={manageConnection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManageConnection(null);
            void reload();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0c0c0c] text-white">
          <DialogHeader>
            <DialogTitle>
              {manageConnection?.providerLabel ?? t('channels.connections.manageTitle')}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {manageConnection?.instanceName || t('channels.connections.manageDescription')}
            </DialogDescription>
          </DialogHeader>
          {manageConnection?.provider === 'evolution' && (
            <EvolutionAPIConfig onConnected={() => void reload()} />
          )}
          {manageConnection?.provider === 'twilio' && (
            <p className="text-sm text-white/60">{t('channels.connections.twilioManageHint')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
