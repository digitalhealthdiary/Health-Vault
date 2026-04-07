import { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Clock, CheckCircle2, Activity, AlertCircle, RotateCcw, X, Bell, BellOff } from 'lucide-react';
import { account } from '../lib/appwrite';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useMedicationReminders } from '../hooks/useMedicationReminders';

// Each dose slot tracks its own "taken" status per day
interface DoseSlot {
  time: string;
  takenDate: string | null; // ISO date string "YYYY-MM-DD" or null
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
  doses: DoseSlot[];  // Multiple dose slots
  inventory: number;
  colorTheme: string;
}

const colorPresets = [
  { id: 'blue',    label: 'Blue',    pill: 'bg-blue-100 text-blue-600 border-blue-200',    badge: 'bg-blue-600' },
  { id: 'purple',  label: 'Purple',  pill: 'bg-purple-100 text-purple-600 border-purple-200',  badge: 'bg-purple-600' },
  { id: 'emerald', label: 'Green',   pill: 'bg-emerald-100 text-emerald-600 border-emerald-200', badge: 'bg-emerald-600' },
  { id: 'rose',    label: 'Rose',    pill: 'bg-rose-100 text-rose-600 border-rose-200',    badge: 'bg-rose-600' },
  { id: 'amber',   label: 'Amber',   pill: 'bg-amber-100 text-amber-600 border-amber-200',   badge: 'bg-amber-600' },
];

const DEFAULT_TIMES_BY_FREQ: Record<number, string[]> = {
  1: ['08:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '14:00', '21:00'],
  4: ['07:00', '12:00', '17:00', '22:00'],
};

export default function Medications() {
  const { user, checkSession } = useAuth();
  const { addNotification } = useNotifications();

  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enablingNotifs, setEnablingNotifs] = useState(false);

  // Sync meds to Service Worker for background dose-time notifications (free, no server)
  const { requestPermission, togglePaused, permissionStatus, paused } = useMedicationReminders(meds);

  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: 1,
    times: ['08:00'],
    inventory: 30,
    colorTheme: 'blue',
  });

  const getTodayStr = useCallback(() => new Date().toISOString().split('T')[0], []);
  const todayStr = getTodayStr();

  // --- Migration: auto-upgrade old single-time schema to new doses array ---
  useEffect(() => {
    if (user && user.prefs) {
      const prefs = user.prefs as unknown as Record<string, unknown>;
      if (prefs.medications) {
        try {
          const parsedMeds = typeof prefs.medications === 'string'
            ? JSON.parse(prefs.medications)
            : prefs.medications;

          const migratedMeds: Medication[] = (parsedMeds as { id: number; name: string; dosage: string; doses?: DoseSlot[]; time?: string; inventory?: number; colorTheme?: string; lastTakenDate?: string | null; taken?: boolean }[]).map((m) => {
            // Already new schema
            if (Array.isArray(m.doses)) return m as Medication;

            // Old schema migration
            const wasSmartTaken = m.lastTakenDate !== undefined ? m.lastTakenDate : (m.taken ? getTodayStr() : null);
            return {
              id: m.id,
              name: m.name,
              dosage: m.dosage || '',
              doses: [{ time: m.time || '08:00', takenDate: wasSmartTaken }],
              inventory: typeof m.inventory === 'number' ? m.inventory : 30,
              colorTheme: m.colorTheme || 'blue',
            };
          });

          setMeds(migratedMeds);
        } catch {
          setMeds([]);
        }
      }
      setLoading(false);
    }
  }, [user, getTodayStr]);

  // Listen for "Mark Taken" tapped on a mobile notification
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'MARK_DOSE_TAKEN') {
        const { medId, doseIdx } = event.data;
        setMeds(prev => {
          const today = new Date().toISOString().split('T')[0];
          const updated = prev.map(m => {
            if (m.id !== medId) return m;
            const doses = m.doses.map((d, i) =>
              i === doseIdx ? { ...d, takenDate: today } : d
            );
            return { ...m, doses };
          });
          saveToPrefs(updated);
          return updated;
        });
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const saveToPrefs = async (updatedMeds: Medication[]) => {
    try {
      const prefs = await account.getPrefs();
      await account.updatePrefs({ ...prefs, medications: JSON.stringify(updatedMeds) });
      await checkSession();
    } catch (err) {
      console.error('Failed to save medications', err);
      addNotification('Sync Error', 'Failed to save to cloud.', 'warning');
    }
  };

  // --- Frequency selector updates time array ---
  const handleFrequencyChange = (freq: number) => {
    const defaultTimes = DEFAULT_TIMES_BY_FREQ[freq] || ['08:00'];
    setNewMed(prev => ({ ...prev, frequency: freq, times: [...defaultTimes] }));
  };

  const updateTime = (index: number, value: string) => {
    setNewMed(prev => {
      const updated = [...prev.times];
      updated[index] = value;
      return { ...prev, times: updated };
    });
  };

  const addMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.dosage || newMed.times.some(t => !t)) return;
    setIsSubmitting(true);
    try {
      const newEntry: Medication = {
        id: Date.now(),
        name: newMed.name,
        dosage: newMed.dosage,
        doses: newMed.times.sort().map(t => ({ time: t, takenDate: null })),
        inventory: newMed.inventory,
        colorTheme: newMed.colorTheme,
      };
      const updated = [...meds, newEntry];
      setMeds(updated);
      setNewMed({ name: '', dosage: '', frequency: 1, times: ['08:00'], inventory: 30, colorTheme: 'blue' });
      await saveToPrefs(updated);
      addNotification('Medication Added', `${newEntry.name} added with ${newEntry.doses.length} dose(s)/day.`, 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDose = async (medId: number, doseIndex: number) => {
    const updatedMeds = meds.map(m => {
      if (m.id !== medId) return m;
      const doses = m.doses.map((d, i) => {
        if (i !== doseIndex) return d;
        const taking = d.takenDate !== todayStr;
        if (taking) {
          const newInv = Math.max(0, m.inventory - 1);
          if (newInv <= 5 && newInv > 0) addNotification('Refill Reminder', `Only ${newInv} doses of ${m.name} left!`, 'warning');
          else if (newInv === 0) addNotification('Out of Stock', `${m.name} is out of stock!`, 'warning');
          // update inventory on this take
          m = { ...m, inventory: newInv };
        } else {
          m = { ...m, inventory: m.inventory + 1 };
        }
        return { ...d, takenDate: taking ? todayStr : null };
      });
      return { ...m, doses };
    });
    setMeds(updatedMeds);
    await saveToPrefs(updatedMeds);
    const med = updatedMeds.find(m => m.id === medId)!;
    const dose = med.doses[doseIndex];
    if (dose.takenDate === todayStr) addNotification('Dose Recorded', `Took ${med.name} (${dose.time}). Keep it up!`, 'success');
  };

  const refillMed = async (id: number) => {
    const updated = meds.map(m => m.id === id ? { ...m, inventory: m.inventory + 30 } : m);
    setMeds(updated);
    await saveToPrefs(updated);
    addNotification('Refilled', `Added 30 doses to ${meds.find(m => m.id === id)?.name}.`, 'success');
  };

  const deleteMed = async (id: number) => {
    if (!confirm('Remove this medication?')) return;
    const name = meds.find(m => m.id === id)?.name;
    const updated = meds.filter(m => m.id !== id);
    setMeds(updated);
    await saveToPrefs(updated);
    addNotification('Removed', `${name} removed from schedule.`, 'info');
  };

  // Summary stats
  const totalDoses = meds.reduce((s, m) => s + m.doses.length, 0);
  const takenToday = meds.reduce((s, m) => s + m.doses.filter(d => d.takenDate === todayStr).length, 0);
  const lowStock = meds.filter(m => m.inventory <= 5).length;

  const handleEnableReminders = async () => {
    setEnablingNotifs(true);
    const granted = await requestPermission();
    setEnablingNotifs(false);
    if (granted) {
      addNotification('Reminders On', 'You will get a push notification at each dose time.', 'success');
    } else {
      addNotification('Permission Denied', 'Enable notifications in your browser settings.', 'warning');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medication Schedule</h1>
          <p className="text-gray-500 mt-1">Track daily doses and manage prescription refills</p>
        </div>

        {/* Reminder toggle */}
        {permissionStatus === 'granted' ? (
          // Already have permission — show pause/resume toggle
          paused ? (
            <button
              onClick={togglePaused}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl transition-all shrink-0"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Resume Reminders</span>
            </button>
          ) : (
            <button
              onClick={togglePaused}
              title="Click to pause reminders"
              className="group flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 hover:bg-red-50 hover:border-red-200 text-emerald-700 hover:text-red-600 text-sm font-semibold rounded-xl transition-all shrink-0"
            >
              <Bell className="w-4 h-4 group-hover:hidden" />
              <BellOff className="w-4 h-4 hidden group-hover:block" />
              <span className="hidden sm:inline group-hover:hidden">Reminders On</span>
              <span className="hidden sm:group-hover:inline">Pause</span>
            </button>
          )
        ) : (
          // No permission yet — show enable button
          <button
            onClick={handleEnableReminders}
            disabled={enablingNotifs}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all shrink-0 disabled:opacity-60"
          >
            {enablingNotifs ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enabling...</>
            ) : (
              <><BellOff className="w-4 h-4" /> <span className="hidden sm:inline">Enable Reminders</span></>
            )}
          </button>
        )}
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{takenToday}<span className="text-sm font-normal text-gray-400">/{totalDoses}</span></p>
            <p className="text-xs text-gray-500 font-medium">Doses Today</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalDoses > 0 ? Math.round((takenToday / totalDoses) * 100) : 0}<span className="text-sm font-normal text-gray-400">%</span></p>
            <p className="text-xs text-gray-500 font-medium">Adherence</p>
          </div>
        </div>
        <div className={`border rounded-2xl p-4 shadow-sm flex items-center space-x-3 ${lowStock > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lowStock > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
            <AlertCircle className={`w-5 h-5 ${lowStock > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${lowStock > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{lowStock}</p>
            <p className="text-xs text-gray-500 font-medium">Low Stock</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" /> Add Prescription
            </h2>
            <form onSubmit={addMed} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
                <input type="text" required value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm" placeholder="e.g. Lisinopril" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                  <input type="text" required value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm" placeholder="10mg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pill Count</label>
                  <input type="number" min="1" required value={newMed.inventory} onChange={e => setNewMed({ ...newMed, inventory: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm" />
                </div>
              </div>

              {/* Frequency Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doses per Day</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(f => (
                    <button key={f} type="button" onClick={() => handleFrequencyChange(f)}
                      className={`py-2 rounded-xl text-sm font-bold border transition-all ${newMed.frequency === f ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      {f}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dose Times</label>
                <div className="space-y-2">
                  {newMed.times.map((t, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-400 w-16 shrink-0">Dose {i + 1}</span>
                      <input type="time" value={t} onChange={e => updateTime(i, e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Label</label>
                <div className="flex space-x-2">
                  {colorPresets.map(c => (
                    <button key={c.id} type="button" onClick={() => setNewMed({ ...newMed, colorTheme: c.id })}
                      className={`w-8 h-8 rounded-full transition-all ${c.badge} ${newMed.colorTheme === c.id ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : 'opacity-50'}`} />
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Add to Schedule'}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-3 text-gray-400" /> Today's Regimen
            </h2>

            {loading ? (
              <div className="flex justify-center items-center h-64"><Activity className="w-8 h-8 text-blue-500 animate-pulse" /></div>
            ) : meds.length > 0 ? (
              <div className="space-y-5">
                {meds.map(med => {
                  const theme = colorPresets.find(c => c.id === med.colorTheme) || colorPresets[0];
                  const isLow = med.inventory <= 5 && med.inventory > 0;
                  const isOut = med.inventory === 0;
                  const allTaken = med.doses.every(d => d.takenDate === todayStr);
                  const takenCount = med.doses.filter(d => d.takenDate === todayStr).length;

                  return (
                    <div key={med.id} className={`rounded-2xl border transition-all ${allTaken ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-200 shadow-sm hover:border-blue-200'}`}>
                      {/* Med Header */}
                      <div className="flex items-center justify-between p-5 pb-3">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-xl border ${allTaken ? 'bg-gray-200 text-gray-400 border-gray-300' : theme.pill}`}>
                            <Pill className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className={`font-bold text-base ${allTaken ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{med.name}</h3>
                              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">{med.dosage}</span>
                              <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">{med.doses.length}×/day</span>
                            </div>
                            <div className="flex items-center mt-1 space-x-3 text-xs font-medium">
                              <span className={`${isOut ? 'text-red-600 font-bold' : isLow ? 'text-amber-600 font-bold' : 'text-gray-400'} flex items-center`}>
                                {(isOut || isLow) && <AlertCircle className="w-3 h-3 mr-1" />} {med.inventory} pills left
                              </span>
                              <span className="text-gray-300">|</span>
                              <span className={`${allTaken ? 'text-emerald-600' : 'text-gray-400'}`}>{takenCount}/{med.doses.length} taken today</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {(isLow || isOut) && (
                            <button onClick={() => refillMed(med.id)} title="Refill (+30)"
                              className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all text-xs font-bold px-3">
                              +30
                            </button>
                          )}
                          <button onClick={() => deleteMed(med.id)}
                            className="p-2 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 rounded-xl transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Dose Slots */}
                      <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {med.doses.map((dose, i) => {
                          const taken = dose.takenDate === todayStr;
                          return (
                            <button key={i} onClick={() => !(!taken && isOut) && toggleDose(med.id, i)}
                              disabled={!taken && isOut}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all
                                ${taken
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : isOut
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700'}`}>
                              <span className="flex items-center">
                                {taken
                                  ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                                  : <Clock className="w-4 h-4 mr-2 text-gray-400" />}
                                Dose {i + 1}
                              </span>
                              <span className="flex items-center space-x-2">
                                <span className={taken ? 'text-emerald-600' : 'text-gray-500'}>{dose.time}</span>
                                {taken && <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
                <Pill className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium text-gray-600">No medications mapped</p>
                <p className="text-xs text-gray-400 mt-1 text-center max-w-sm">Add prescriptions from the left panel.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
