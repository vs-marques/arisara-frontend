/**
 * Pré-requisitos de mídia no lobby Saturno (mobile / WebView costumam falhar aqui).
 */
export type SaturnoMeetMediaBlockReason = 'insecure_context' | 'no_get_user_media';

export function getSaturnoMeetMediaBlockReason(): SaturnoMeetMediaBlockReason | null {
  if (typeof window === 'undefined') return null;
  if (!window.isSecureContext) return 'insecure_context';
  if (!navigator.mediaDevices?.getUserMedia) return 'no_get_user_media';
  return null;
}

/** deviceId vazio antes da permissão no iOS — não usar em { exact: '' }. */
export function saturnoMeetDeviceOptionValue(deviceId: string, index: number): string {
  return deviceId && deviceId.length > 0 ? deviceId : `__default_${index}`;
}

export function isSaturnoMeetDefaultDeviceToken(value: string | undefined): boolean {
  return !value || value.startsWith('__default_');
}
