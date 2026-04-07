import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Pill, Activity, FileText, Link2, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { databases, APPWRITE_CONFIG } from '../../lib/appwrite';
import { Query } from 'appwrite';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'page' | 'vital' | 'medication' | 'record';
  route: string;
  icon: React.ReactNode;
}

const STATIC_PAGES: SearchResult[] = [
  { id: 'p1', title: 'Dashboard', subtitle: 'Overview & health summary', category: 'page', route: '/', icon: <Zap className="w-4 h-4 text-blue-500" /> },
  { id: 'p2', title: 'Vitals', subtitle: 'Track blood pressure, glucose, weight', category: 'page', route: '/vitals', icon: <Activity className="w-4 h-4 text-rose-500" /> },
  { id: 'p3', title: 'Medical Records', subtitle: 'Prescriptions and lab reports', category: 'page', route: '/records', icon: <FileText className="w-4 h-4 text-indigo-500" /> },
  { id: 'p4', title: 'Medications', subtitle: 'Daily medication schedule', category: 'page', route: '/medications', icon: <Pill className="w-4 h-4 text-emerald-500" /> },
  { id: 'p5', title: 'Share Access', subtitle: 'Manage doctor share links', category: 'page', route: '/share', icon: <Link2 className="w-4 h-4 text-purple-500" /> },
];

const CATEGORY_LABELS: Record<string, string> = {
  page: 'Pages',
  vital: 'Vitals',
  medication: 'Medications',
  record: 'Records',
};

export function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(STATIC_PAGES);
      setSelected(0);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(STATIC_PAGES); return; }
    setLoading(true);

    const q_lower = q.toLowerCase();

    // Filter static pages
    const pageResults = STATIC_PAGES.filter(p =>
      p.title.toLowerCase().includes(q_lower) || p.subtitle.toLowerCase().includes(q_lower)
    );

    const dynamicResults: SearchResult[] = [];

    if (user) {
      try {
        // Search Medications from user prefs
        const medsRaw = (user.prefs as unknown as Record<string, unknown>)?.medications;
        if (medsRaw) {
          const meds = typeof medsRaw === 'string' ? JSON.parse(medsRaw) : medsRaw;
          (meds as { name: string; dosage: string; id: number; doses?: unknown[] }[])
            .filter(m => m.name?.toLowerCase().includes(q_lower) || m.dosage?.toLowerCase().includes(q_lower))
            .slice(0, 3)
            .forEach(m => dynamicResults.push({
              id: `med-${m.id}`,
              title: m.name,
              subtitle: `${m.dosage} · ${Array.isArray(m.doses) ? m.doses.length : 1}×/day`,
              category: 'medication',
              route: '/medications',
              icon: <Pill className="w-4 h-4 text-emerald-500" />,
            }));
        }
      } catch { /* ignore parse errors */ }

      // Search Vitals from Appwrite
      try {
        const vitalsRes = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.vitalsCollectionId,
          [Query.equal('userId', user.$id), Query.limit(5)]
        );
        vitalsRes.documents.forEach(v => {
          const dateStr = new Date(v.$createdAt).toLocaleDateString();
          if (dateStr.includes(q_lower) || `${v.heartRate}`.includes(q_lower) || `${v.systolic}`.includes(q_lower)) {
            dynamicResults.push({
              id: `vital-${v.$id}`,
              title: `Vitals — ${dateStr}`,
              subtitle: `HR: ${v.heartRate} bpm · BP: ${v.systolic}/${v.diastolic}`,
              category: 'vital',
              route: '/vitals',
              icon: <Activity className="w-4 h-4 text-rose-500" />,
            });
          }
        });
      } catch { /* ignore */ }

      // Search Records
      try {
        const recordsRes = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.docsCollectionId,
          [Query.equal('userId', user.$id), Query.limit(10)]
        );
        recordsRes.documents
          .filter(r => r.name?.toLowerCase().includes(q_lower) || r.type?.toLowerCase().includes(q_lower))
          .slice(0, 3)
          .forEach(r => {
            dynamicResults.push({
              id: `rec-${r.$id}`,
              title: r.name,
              subtitle: `${r.type?.replace('_', ' ')} · ${new Date(r.$createdAt).toLocaleDateString()}`,
              category: 'record',
              route: '/records',
              icon: <FileText className="w-4 h-4 text-indigo-500" />,
            });
          });
      } catch { /* ignore */ }
    }

    setResults([...pageResults, ...dynamicResults]);
    setSelected(0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const navigate_to = (route: string) => {
    navigate(route);
    setOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { navigate_to(results[selected].route); }
  };

  // Group results by category
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  let globalIndex = 0;

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 px-3 py-2 md:pl-4 md:pr-3 md:w-64 lg:w-72
          bg-white border border-gray-200 hover:border-blue-300
          rounded-full md:rounded-xl
          shadow-sm hover:shadow-md
          transition-all duration-200"
      >
        <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
        <span className="hidden md:flex flex-1 text-left text-xs font-medium text-gray-400">Search anything...</span>
        <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] font-bold bg-gray-50 border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded-md shadow-inner shrink-0">⌘K</kbd>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-gray-900/30 backdrop-blur-sm animate-in fade-in duration-150">
          <div ref={containerRef} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

            {/* Input */}
            <div className="flex items-center px-4 py-3 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, medications, records..."
                className="flex-1 outline-none text-gray-900 text-sm font-medium placeholder:text-gray-400"
              />
              {loading && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />}
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 && !loading ? (
                <div className="text-center py-10 text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No results for "{query}"</p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5">{CATEGORY_LABELS[category] || category}</p>
                    {items.map(item => {
                      const idx = globalIndex++;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate_to(item.route)}
                          onMouseEnter={() => setSelected(idx)}
                          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left transition-all group ${selected === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0 border ${selected === idx ? 'bg-blue-100 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${selected === idx ? 'text-blue-700' : 'text-gray-800'}`}>{item.title}</p>
                            <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                          </div>
                          <ArrowRight className={`w-4 h-4 shrink-0 transition-opacity ${selected === idx ? 'text-blue-400 opacity-100' : 'opacity-0'}`} />
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
              <span className="text-[10px] text-gray-400">↑↓ navigate · Enter select · Esc close</span>
              <span className="text-[10px] text-gray-400 font-medium">{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
