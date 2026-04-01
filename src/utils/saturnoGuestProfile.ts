/** Perfil mínimo do convidado na prejoin (sessionStorage), usado no token LiveKit. */

export const saturnoGuestProfileKey = (roomPublicId: string) =>
  `saturno_meet_guest_profile_${roomPublicId.trim()}`;

export type SaturnoGuestProfile = {
  name: string;
  email?: string;
  consentAt?: string;
};

export function readSaturnoGuestProfile(roomPublicId: string): SaturnoGuestProfile | null {
  if (!roomPublicId.trim()) return null;
  try {
    const raw = sessionStorage.getItem(saturnoGuestProfileKey(roomPublicId));
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<SaturnoGuestProfile>;
    if (!j.name || typeof j.name !== 'string' || !j.name.trim()) return null;
    return {
      name: j.name.trim(),
      email: typeof j.email === 'string' ? j.email.trim() || undefined : undefined,
      consentAt: typeof j.consentAt === 'string' ? j.consentAt : undefined,
    };
  } catch {
    return null;
  }
}
