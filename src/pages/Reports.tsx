import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { Query } from 'appwrite';
import { Activity, Sparkles, FileText, Calendar, Pill, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

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

  // Helper: call AI with Gemini primary + OpenRouter fallback
  const callAIWithFallback = async (prompt: string, geminiApiKey: string, openRouterApiKey?: string): Promise<string> => {
    // First try Gemini with retry + model fallback
    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    const maxRetries = 3;

    for (const model of models) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates?.length > 0) {
            return data.candidates[0].content.parts[0].text;
          }
          throw new Error('No candidates returned from Gemini.');
        }

        // If 503 / 429 (overloaded or rate-limited), retry with backoff
        if (response.status === 503 || response.status === 429) {
          console.warn(`Gemini ${model} returned ${response.status} (attempt ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          // Exhausted retries for this model — try next model
          console.warn(`All retries exhausted for ${model}, trying next model...`);
          break;
        }

        // Any other HTTP error — throw immediately
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message || `Gemini API returned status ${response.status}`
        );
      }
    }

    // If all Gemini attempts failed, try OpenRouter as fallback
    if (openRouterApiKey) {
      console.log('Gemini unavailable, trying OpenRouter fallback...');
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Health Report Generator'
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b:free', // Free model
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.choices?.length > 0) {
            return data.choices[0].message.content;
          }
          throw new Error('No response from OpenRouter.');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message || `OpenRouter API returned status ${response.status}`
        );
      } catch (error) {
        console.error('OpenRouter fallback failed:', error);
        // Continue to throw the original error
      }
    }

    throw new Error('All AI services are currently unavailable. Please try again in a few minutes.');
  };

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
      const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      const text = await callAIWithFallback(prompt, apiKey, openRouterKey);
      setReport(text);
      addNotification('AI Insight Ready', 'Your comprehensive health report has been generated!', 'success');
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setReport(`⚠️ ${msg}\n\nPlease wait a minute and try again.`);
      addNotification('Report Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">AI Health Reports</h1>
        <p className="text-gray-500 mt-1">Comprehensive insights from your vitals, medications & documents — powered by Gemini or OpenRouter</p>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >

        {/* Left Column */}
        <div className="lg:col-span-1 space-y-5">
          {/* Generate Card */}
          <motion.div 
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white relative overflow-hidden cursor-pointer"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <motion.div
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6, type: "spring", stiffness: 200 }}
            >
              <Sparkles className="w-8 h-8 mb-4 text-purple-200" />
            </motion.div>
            <h2 className="text-lg font-semibold relative z-10">Comprehensive AI Report</h2>
            <p className="text-sm text-indigo-100 mt-2 relative z-10 leading-relaxed">
              AI analyzes your <strong>vitals</strong>, <strong>medications</strong>, and <strong>uploaded documents</strong> together for a complete picture.
            </p>
            <motion.button
              onClick={generateReport}
              disabled={loading}
              className="mt-6 w-full bg-white text-indigo-600 font-semibold py-3 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-75 disabled:hover:translate-y-0 disabled:cursor-not-allowed relative z-10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
          </motion.div>

          {/* Data Summary Cards */}
          <motion.div 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <motion.h3 
              className="font-semibold text-gray-800 flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Calendar className="w-4 h-4 mr-2 text-gray-400" /> Data Being Analyzed
            </motion.h3>

            <motion.div 
              className="flex items-center justify-between py-2.5 px-3 bg-rose-50 rounded-xl border border-rose-100"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <div className="flex items-center text-sm font-medium text-rose-700">
                <Activity className="w-4 h-4 mr-2" /> Vital Logs
              </div>
              <span className="text-sm font-bold text-rose-700">{vitalsHistory.length}</span>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between py-2.5 px-3 bg-emerald-50 rounded-xl border border-emerald-100"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <div className="flex items-center text-sm font-medium text-emerald-700">
                <Pill className="w-4 h-4 mr-2" /> Active Medications
              </div>
              <span className="text-sm font-bold text-emerald-700">{medsData.length}</span>
            </motion.div>

            <motion.div 
              className="flex items-center justify-between py-2.5 px-3 bg-indigo-50 rounded-xl border border-indigo-100"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <div className="flex items-center text-sm font-medium text-indigo-700">
                <Upload className="w-4 h-4 mr-2" /> Uploaded Records
              </div>
              <span className="text-sm font-bold text-indigo-700">{recordsHistory.length}</span>
            </motion.div>

            {/* Recent vitals preview */}
            {vitalsHistory.length > 0 && (
              <motion.div 
                className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">Recent Vitals</p>
                {vitalsHistory.slice(0, 5).map((v, index) => (
                  <motion.div 
                    key={v.$id as string} 
                    className="text-xs p-2 bg-gray-50 rounded-lg border border-gray-100 flex justify-between"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 + index * 0.1 }}
                  >
                    <span className="text-gray-400">{new Date(v.date as string).toLocaleDateString()}</span>
                    <span className="font-medium text-gray-700">BP: {v.systolic as number}/{v.diastolic as number} · HR: {v.heartRate as number}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Report */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <motion.div 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[500px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            {report ? (
              <motion.div 
                className="animate-in fade-in duration-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <motion.div 
                  className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-100"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <motion.div 
                    className="p-2 bg-purple-100 rounded-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
                  >
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Comprehensive Health Report</h2>
                    <p className="text-sm text-gray-500">
                      Generated by AI · {vitalsHistory.length} vitals · {medsData.length} medications · {recordsHistory.length} documents · {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  className="max-w-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm font-medium">
                    {report}
                  </p>
                </motion.div>

                <motion.div 
                  className="mt-10 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm flex items-start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <Activity className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 text-blue-600" />
                  <p>This AI-generated report is for informational purposes only and does not replace professional medical advice. Always consult your doctor for medical decisions.</p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div 
                className="h-full flex flex-col items-center justify-center text-gray-400 py-20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.0, type: "spring", stiffness: 150 }}
                >
                  <FileText className="w-12 h-12 mb-4 opacity-30" />
                </motion.div>
                <motion.h3 
                  className="text-lg font-medium text-gray-600"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  No report generated yet
                </motion.h3>
                <motion.p 
                  className="text-sm mt-2 max-w-sm text-center text-gray-400"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  Click "Generate Full Report" to let AI analyze all your health data — vitals, medications, and uploaded medical documents — into one comprehensive report.
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
