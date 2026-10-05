import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '../hooks/toast';

/** Registers the service worker and offers a reload when a new version is ready (never reloads mid-set on its own). */
export function UpdatePrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // Offline support is an enhancement – the app keeps working without it.
      console.warn('[setlog] service worker registration failed', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast({ message: 'A new version is available', action: { label: 'Reload', onClick: () => void updateServiceWorker(true) }, duration: 30000 });
    }
  }, [needRefresh, toast, updateServiceWorker]);

  return null;
}
