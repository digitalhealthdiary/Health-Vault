// ── HealthVault Medication Reminder Service Worker ──
// Completely free — uses Web Push API (no FCM / no server)

let medications = [];        // [{ id, name, dosage, doses:[{time,takenDate}] }]
let checkInterval = null;

// ── Receive schedule from the app ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_MEDS') {
    medications = event.data.medications || [];
    startScheduler();           // restart the minute-checker
  }
});

// ── Minute-by-minute checker ───────────────────────────────────────────────
function startScheduler() {
  if (checkInterval) clearInterval(checkInterval);
  checkMedicationTimes();                      // run immediately on load
  checkInterval = setInterval(checkMedicationTimes, 60_000);  // then every min
}

function pad(n) { return String(n).padStart(2, '0'); }

function checkMedicationTimes() {
  const now   = new Date();
  const hhmm  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const today = now.toISOString().split('T')[0];

  medications.forEach((med) => {
    if (!Array.isArray(med.doses)) return;

    med.doses.forEach((dose, idx) => {
      const doseHHMM = dose.time.length === 5 ? dose.time          // "08:00"
                     : dose.time.slice(0, 5);                       // safety trim

      // Fire if: time matches AND not already taken today
      if (doseHHMM === hhmm && dose.takenDate !== today) {
        const tag = `med-${med.id}-dose${idx}`;   // one notif per dose slot

        self.registration.showNotification(`💊 Time for ${med.name}`, {
          body: `Dose ${idx + 1}: ${med.dosage}  •  ${formatTime(dose.time)}`,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag,                        // deduplicates repeated firings
          requireInteraction: true,   // stays until dismissed on Android
          vibrate: [200, 100, 200],
          data: { medId: med.id, doseIdx: idx, url: '/medications' },
          actions: [
            { action: 'open', title: '✓ Mark Taken' },
            { action: 'dismiss', title: '🔕 Dismiss'  },
          ],
        });
      }
    });
  });
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ── Notification click handler ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Focus or open the app on the Medications page
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        const appClient = list.find((c) => c.url.includes(self.location.origin));
        if (appClient) {
          appClient.focus();
          appClient.postMessage({
            type: 'MARK_DOSE_TAKEN',
            medId:   event.notification.data?.medId,
            doseIdx: event.notification.data?.doseIdx,
          });
        } else {
          clients.openWindow('/medications');
        }
      })
    );
  }
});

// ── Install / Activate (skip waiting for instant activation) ──────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
