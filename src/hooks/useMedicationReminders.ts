import { useEffect, useRef, useCallback, useState } from 'react';

export interface SwMedication {
  id: number;
  name: string;
  dosage: string;
  doses: { time: string; takenDate: string | null }[];
}

const PAUSED_KEY = 'hv-reminders-paused';

function postToSW(data: unknown) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(data);
  }
}

/** Register SW + sync medication schedule → triggers dose-time notifications */
export function useMedicationReminders(meds: SwMedication[]) {
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // Paused state — persisted in localStorage so it survives page reloads
  const [paused, setPaused] = useState(() => localStorage.getItem(PAUSED_KEY) === '1');

  // Register service worker once
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => { swRegRef.current = reg; })
      .catch(console.error);
  }, []);

  // Push schedule (or empty list when paused) whenever meds or paused state changes
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    postToSW({ type: 'UPDATE_MEDS', medications: paused ? [] : meds });
  }, [meds, paused]);

  // Also push after SW controller changes (e.g. on very first load)
  useEffect(() => {
    const handler = () => postToSW({ type: 'UPDATE_MEDS', medications: paused ? [] : meds });
    navigator.serviceWorker?.addEventListener('controllerchange', handler);
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meds, paused]);

  /** Request browser notification permission (only asked once by the browser) */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications.');
      return false;
    }
    if (Notification.permission === 'granted') {
      // Already granted — just un-pause
      setPaused(false);
      localStorage.removeItem(PAUSED_KEY);
      return true;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setPaused(false);
      localStorage.removeItem(PAUSED_KEY);
      postToSW({ type: 'UPDATE_MEDS', medications: meds });
      return true;
    }
    return false;
  }, [meds]);

  /** Pause/resume without touching browser permission */
  const togglePaused = useCallback(() => {
    setPaused(prev => {
      const next = !prev;
      if (next) {
        localStorage.setItem(PAUSED_KEY, '1');
        postToSW({ type: 'UPDATE_MEDS', medications: [] }); // clear SW schedule
      } else {
        localStorage.removeItem(PAUSED_KEY);
        postToSW({ type: 'UPDATE_MEDS', medications: meds }); // restore
      }
      return next;
    });
  }, [meds]);

  const permissionStatus: NotificationPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';

  return { requestPermission, togglePaused, permissionStatus, paused };
}
