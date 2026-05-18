export type ConnectionStatus = 'connected' | 'pending' | 'disconnected';

export type ConnectionProvider = 'evolution' | 'twilio' | 'meta' | 'instagram' | 'webchat';

export interface ConnectionItem {
  id: string;
  provider: ConnectionProvider;
  providerLabel: string;
  channelType: string;
  instanceName: string;
  description: string;
  status: ConnectionStatus;
  docUrl?: string;
  enabled: boolean;
  phoneNumber?: string | null;
  /** ID interno (ex.: número Twilio) para ações específicas */
  resourceId?: string;
}
