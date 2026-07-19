import { useCallback, useEffect, useState } from 'react';

import { extractApiErrorMessage } from '@/lib/api';
import {
  hasCurrentCommunityConsent,
  moderationApi,
  type CommunityConsent,
} from '@/lib/moderation-api';

export function useCommunityConsent(token: string | null) {
  const [consent, setConsent] = useState<CommunityConsent | null>(null);
  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setConsent(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      setConsent(await moderationApi.getConsent(token));
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos comprobar tu consentimiento.'));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const accepted = hasCurrentCommunityConsent(consent);

  const acceptIfNeeded = useCallback(async () => {
    if (accepted) return;
    if (!checked) {
      throw new Error('Debes aceptar las normas de la comunidad para continuar.');
    }
    if (!token) throw new Error('Debes iniciar sesión para continuar.');

    setIsAccepting(true);
    setError('');
    try {
      const acceptedConsent = await moderationApi.acceptConsent(token);
      setConsent(acceptedConsent);
      setChecked(false);
    } finally {
      setIsAccepting(false);
    }
  }, [accepted, checked, token]);

  return {
    accepted,
    acceptIfNeeded,
    checked,
    consent,
    error,
    isAccepting,
    isLoading,
    reload: load,
    setChecked,
  };
}
