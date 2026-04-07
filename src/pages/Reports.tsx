import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { Query } from 'appwrite';
import { Activity, Sparkles, FileText, Calendar, Pill, Upload } from 'lucide-react';

interface DoseSlot { time: string; takenDate: string | null; }
interface MedData { name: string; dosage: string; doses?: DoseSlot[]; time?: string; inventory?: number; }

export default function Reports() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const [vitalsHistory, setVitalsHistory] = useState<Record<string, unknown>[]>([]);
  const [recordsHistory, setRecordsHistory] = useState<Record<string, unknown>[]>([]);
  const [medsData, setMedsData] = useState<MedData[]>([]);

  useEffect(() => {
    if (!user) return;

    // Vitals
    databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vitalsCollectionId,
      [Query.equal('userId', user.$id), Query.orderDesc('date'), Query.limit(20)]
    ).then(res => setVitalsHistory(res.documents as Record<string, unknown>[]));

    // Uploaded Records
    databases.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.docsCollectionId,
      [Query.equal('userId', user.$id), Query.limit(20)]
    ).then(res => setRecordsHistory(res.documents as Record<string, unknown>[]));

    // Medications from prefs
    try {
      const prefs = user.prefs as unknown as Record<string, unknown>;
      const raw = prefs?.medications;
      if (raw) {
        const parsed: MedData[] = typeof raw === 'string' ? JSON.parse(raw) : raw as MedData[];
        setMedsData(parsed);
      }
    } catch { /* ignore */ }

  }, [user]);

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // --- Build vitals section ---
      const vitalsSummary = vitalsHistory.length > 0
        ? vitalsHistory.map(v =>
            `  • ${new Date(v.date as string).toLocaleDateString()}: HR=${v.heartRate}bpm, BP=${v.systolic}/${v.diastolic}mmHg, Weight=${v.weight}kg, Blood Sugar=${v.bloodSugar}mg/dL`
          ).join('\n')
        : '  No vitals recorded yet.';

      // --- Build medications section ---
      const medsSummary = medsData.length > 0
        ? medsData.map(m => {
            const freq = Array.isArray(m.doses) ? m.doses.length : 1;
            const times = Array.isArray(m.doses)
              ? m.doses.map((d: DoseSlot) => d.time).join(', ')
              : m.time || 'unspecified';
            const stock = m.inventory !== undefined ? ` (${m.inventory} pills remaining)` : '';
            return `  • ${m.name} ${m.dosage} — ${freq}x/day at ${times}${stock}`;
          }).join('\n')
        : '  No medications on record.';

      // --- Build uploaded records section ---
      const recordsSummary = recordsHistory.length > 0
        ? recordsHistory.map(r =>
            `  • ${r.name} (${(r.type as string)?.replace('_', ' ')}) — uploaded ${new Date(r.$createdAt as string).toLocaleDateString()}`
          ).join('\n')
        : '  No medical documents uploaded.';

      const prompt = `
You are an expert AI Health Assistant performing a comprehensive health review for a patient named ${user.name}.
You have access to ALL of the following patient data. Please produce a detailed, supportive, and professional health summary report.

INSTRUCTIONS:
- Analyze trends across ALL data sources below (vitals, medications, uploaded records).
- Note any concerning patterns (e.g. high BP trend, elevated blood sugar, low medication inventory).
- Comment on medication adherence and any potential interactions or concerns you notice.
- Reference the types of uploaded documents and what they might imply.
- Provide specific, actionable lifestyle and health recommendations.
- Use CAPITAL LETTERS for section headers. DO NOT use markdown asterisks, hashes, or bold syntax.
- Separate sections with blank lines. Keep tone warm, supportive, and professional.

PATIENT VITALS HISTORY (last ${vitalsHistory.length} logs):
${vitalsSummary}

CURRENT MEDICATIONS (${medsData.length} active):
${medsSummary}

UPLOADED MEDICAL DOCUMENTS (${recordsHistory.length} total):
${recordsSummary}
`.trim();

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );

      const data = await response.json();
      if (data.candidates?.length > 0) {
        setReport(data.candidates[0].content.parts[0].text);
        addNotification('AI Insight Ready', 'Your comprehensive health report has been generated!', 'success');
      } else {
        setReport('Failed to generate report. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setReport('An error occurred while generating the report via Gemini API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Health Reports</h1>
        <p className="text-gray-500 mt-1">Comprehensive insights from your vitals, medications & documents — powered by Gemini 2.5 Flash</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-1 space-y-5">
          {/* Generate Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <Sparkles className="w-8 h-8 mb-4 text-purple-200" />
            <h2 className="text-lg font-semibold relative z-10">Comprehensive AI Report</h2>
            <p className="text-sm text-indigo-100 mt-2 relative z-10 leading-relaxed">
              Gemini analyzes your <strong>vitals</strong>, <strong>medications</strong>, and <strong>uploaded documents</strong> together for a complete picture.
            </p>
            <button
              onClick={generateReport}
              disabled={loading}
              className="mt-6 w-full bg-white text-indigo-600 font-semibold py-3 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-75 disabled:hover:translate-y-0 disabled:cursor-not-allowed relative z-10"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Analyzing all data...
                </span>
              ) : 'Generate Full Report'}
            </button>
          </div>

          {/* Data Summary Cards */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" /> Data Being Analyzed
            </h3>

            <div className="flex items-center justify-between py-2.5 px-3 bg-rose-50 rounded-xl border border-rose-100">
              <div className="flex items-center text-sm font-medium text-rose-700">
                <Activity className="w-4 h-4 mr-2" /> Vital Logs
              </div>
              <span className="text-sm font-bold text-rose-700">{vitalsHistory.length}</span>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center text-sm font-medium text-emerald-700">
                <Pill className="w-4 h-4 mr-2" /> Active Medications
              </div>
              <span className="text-sm font-bold text-emerald-700">{medsData.length}</span>
            </div>

            <div className="flex items-center justify-between py-2.5 px-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="flex items-center text-sm font-medium text-indigo-700">
                <Upload className="w-4 h-4 mr-2" /> Uploaded Records
              </div>
              <span className="text-sm font-bold text-indigo-700">{recordsHistory.length}</span>
            </div>

            {/* Recent vitals preview */}
            {vitalsHistory.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">Recent Vitals</p>
                {vitalsHistory.slice(0, 5).map(v => (
                  <div key={v.$id as string} className="text-xs p-2 bg-gray-50 rounded-lg border border-gray-100 flex justify-between">
                    <span className="text-gray-400">{new Date(v.date as string).toLocaleDateString()}</span>
                    <span className="font-medium text-gray-700">BP: {v.systolic as number}/{v.diastolic as number} · HR: {v.heartRate as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Report */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
            {report ? (
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Comprehensive Health Report</h2>
                    <p className="text-sm text-gray-500">
                      Generated by Gemini 2.5 Flash · {vitalsHistory.length} vitals · {medsData.length} medications · {recordsHistory.length} documents · {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm font-medium">
                    {report}
                  </p>
                </div>

                <div className="mt-10 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm flex items-start">
                  <Activity className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-blue-600" />
                  <p>This AI-generated report is for informational purposes only and does not replace professional medical advice. Always consult your doctor for medical decisions.</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                <FileText className="w-12 h-12 mb-4 opacity-30" />
                <h3 className="text-lg font-medium text-gray-600">No report generated yet</h3>
                <p className="text-sm mt-2 max-w-sm text-center text-gray-400">
                  Click "Generate Full Report" to let Gemini analyze all your health data — vitals, medications, and uploaded medical documents — into one comprehensive report.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
