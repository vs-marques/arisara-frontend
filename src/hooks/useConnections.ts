import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { IntegrationService } from '@/services/integrationService';
import type { ConnectionItem, ConnectionStatus } from '@/types/channels';

function slugifyInstanceName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || 'instancia'
  );
}

function mapEvolutionStatus(status: string): ConnectionStatus {
  if (status === 'open') return 'connected';
  if (status === 'connecting' || status === 'close') return 'pending';
  return 'disconnected';
}

export function useConnections() {
  const { currentWorkspace, effectiveTenantId, isPFWorkspace } = useWorkspace();
  const evolutionOpts = isPFWorkspace ? { useWorkspaceId: true as const } : undefined;

  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!effectiveTenantId) {
      setConnections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const items: ConnectionItem[] = [];

    try {
      const evo = await IntegrationService.getEvolutionStatus(
        effectiveTenantId,
        evolutionOpts
      );
      if (evo.status !== 'disconnected') {
        const instanceName = currentWorkspace?.name
          ? slugifyInstanceName(currentWorkspace.name)
          : `company-${effectiveTenantId.substring(0, 8)}`;

        items.push({
          id: `evolution-${effectiveTenantId}`,
          provider: 'evolution',
          providerLabel: 'Evolution API',
          channelType: 'WhatsApp',
          instanceName,
          description:
            'Evolution API é uma plataforma que facilita a automação e integração de mensagens WhatsApp.',
          status: mapEvolutionStatus(evo.status),
          enabled: evo.status === 'open',
          phoneNumber: evo.phone_number,
        });
      }
    } catch {
      // sem instância Evolution
    }

    if (currentWorkspace?.id) {
      try {
        const numbers = await IntegrationService.listTwilioWhatsAppNumbers(
          currentWorkspace.id,
          false
        );
        for (const n of numbers) {
          items.push({
            id: `twilio-${n.id}`,
            provider: 'twilio',
            providerLabel: 'Twilio',
            channelType: 'WhatsApp',
            instanceName: n.display_name || n.whatsapp_number,
            description: n.description || 'Número WhatsApp via Twilio.',
            status: n.is_active && n.is_verified ? 'connected' : 'pending',
            docUrl: 'https://www.twilio.com/docs/whatsapp',
            enabled: n.is_active,
            phoneNumber: n.whatsapp_number,
            resourceId: n.id,
          });
        }
      } catch {
        // Twilio não configurado
      }
    }

    setConnections(items);
    setLoading(false);
  }, [currentWorkspace?.id, currentWorkspace?.name, effectiveTenantId, isPFWorkspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = connections.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.instanceName.toLowerCase().includes(q) ||
      c.providerLabel.toLowerCase().includes(q) ||
      c.channelType.toLowerCase().includes(q) ||
      (c.phoneNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  const activeCount = connections.filter((c) => c.status === 'connected').length;

  return {
    connections: filtered,
    totalCount: connections.length,
    activeCount,
    loading,
    search,
    setSearch,
    reload: load,
  };
}

export type UseConnectionsResult = ReturnType<typeof useConnections>;
