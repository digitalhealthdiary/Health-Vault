import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';
import { Activity, Heart, Droplets, Scale, TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VitalDocument extends Models.Document {
  userId: string;
  heartRate: number;
  systolic: number;
  diastolic: number;
  weight: number;
  bloodSugar: number;
  date: string;
}

export default function Vitals() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [vitalsList, setVitalsList] = useState<VitalDocument[]>([]);
  
  const [formData, setFormData] = useState({
    heartRate: '',
    systolic: '',
    diastolic: '',
    weight: '',
    bloodSugar: ''
  });

  const fetchVitals = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.vitalsCollectionId,
        [
          Query.equal('userId', user.$id),
          Query.orderDesc('date'),
          Query.limit(20)
        ]
      );
      setVitalsList(response.documents as unknown as VitalDocument[]);
    } catch (error) {
      console.error('Failed to fetch vitals', error);
      addNotification('Error', 'Failed to load vital records from cloud.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.vitalsCollectionId,
        ID.unique(),
        {
          userId: user.$id,
          heartRate: parseInt(formData.heartRate) || null,
          systolic: parseInt(formData.systolic) || null,
          diastolic: parseInt(formData.diastolic) || null,
          weight: parseFloat(formData.weight) || null,
          bloodSugar: parseFloat(formData.bloodSugar) || null,
          date: new Date().toISOString()
        }
      );
      
      setFormData({ heartRate: '', systolic: '', diastolic: '', weight: '', bloodSugar: '' });
      addNotification('Vitals Logged', `Successfully recorded today's health metrics.`, 'success');
      fetchVitals();
    } catch (error) {
      console.error('Failed to save vitals', error);
      addNotification('Log Failed', `Could not save vitals. Please try again.`, 'warning');
    } finally {
      setLoading(false);
    }
  };

  // Health Status Helpers
  const getBPHints = (sys: number, dia: number) => {
    if (!sys || !dia) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-100', icon: Activity };
    if (sys < 120 && dia < 80) return { label: 'Normal', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 };
    if (sys >= 140 || dia >= 90) return { label: 'High Stage 2', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle };
    if (sys >= 130 || dia >= 80) return { label: 'High Stage 1', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertCircle };
    return { label: 'Elevated', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertCircle };
  };

  const getHRHints = (hr: number) => {
    if (!hr) return { label: '-', color: 'text-gray-500' };
    if (hr >= 60 && hr <= 100) return { label: 'Normal', color: 'text-emerald-600' };
    if (hr > 100) return { label: 'Tachycardia (High)', color: 'text-red-600' };
    return { label: 'Bradycardia (Low)', color: 'text-blue-600' };
  };

  const getSugarHints = (sugar: number) => {
    if (!sugar) return { label: '-', color: 'text-gray-500' };
    if (sugar < 100) return { label: 'Normal Fasting', color: 'text-emerald-600' };
    if (sugar >= 100 && sugar <= 125) return { label: 'Pre-diabetic', color: 'text-yellow-600' };
    return { label: 'High', color: 'text-red-600' };
  };

  const latest = vitalsList[0];
  const previous = vitalsList[1];

  const renderTrend = (current: number | null | undefined, prev: number | null | undefined, inverse: boolean = false) => {
    if (!current || !prev) return null;
    const diff = current - prev;
    if (diff === 0) return <span className="text-gray-400 text-xs ml-2 font-medium">— No change</span>;
    // For weight/HR/BP generally going down towards normal is better contextually if high, but for simplicity inverse implies lower is "good".
    // Let's standardise visually: Green if inverse?diff<0. 
    const isGood = inverse ? diff < 0 : diff > 0; 
    return (
      <span className={`text-xs ml-2 flex items-center font-bold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
        {diff > 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
        {Math.abs(diff).toFixed(1)}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vitals Monitoring</h1>
        <p className="text-gray-500 mt-1">Track and instantly evaluate your physiological health data over time</p>
      </div>

      {/* Top Value Cards (Rendered if data exists) */}
      {latest && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-blue-200 hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform"><Heart className="w-5 h-5" /></div>
               <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">Heart Rate</span>
             </div>
             <div className="flex items-baseline space-x-1">
               <span className="text-3xl font-black text-gray-900 tabular-nums">{latest.heartRate || '--'}</span>
               <span className="text-sm font-medium text-gray-400 mb-1">bpm</span>
             </div>
             <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
               <span className={`text-xs font-bold uppercase tracking-wider ${getHRHints(latest.heartRate).color}`}>{getHRHints(latest.heartRate).label}</span>
               {renderTrend(latest.heartRate, previous?.heartRate, true)}
             </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-blue-200 hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform"><Activity className="w-5 h-5" /></div>
               <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">Blood Pressure</span>
             </div>
             <div className="flex items-baseline space-x-1">
               <span className="text-3xl font-black text-gray-900 tabular-nums">
                 {latest.systolic || '--'}
                 <span className="text-xl text-gray-300 font-medium">/{latest.diastolic || '--'}</span>
               </span>
               <span className="text-sm font-medium text-gray-400 mb-1">mmHg</span>
             </div>
             <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
               {latest.systolic ? (
                 <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold ${getBPHints(latest.systolic, latest.diastolic).bg} ${getBPHints(latest.systolic, latest.diastolic).color}`}>
                   {getBPHints(latest.systolic, latest.diastolic).label}
                 </span>
               ) : <span className="text-xs text-gray-400 font-medium">-</span>}
               {renderTrend(latest.systolic, previous?.systolic, true)}
             </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-blue-200 hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Droplets className="w-5 h-5" /></div>
               <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">Blood Sugar</span>
             </div>
             <div className="flex items-baseline space-x-1">
               <span className="text-3xl font-black text-gray-900 tabular-nums">{latest.bloodSugar || '--'}</span>
               <span className="text-sm font-medium text-gray-400 mb-1">mg/dL</span>
             </div>
             <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
               <span className={`text-xs font-bold uppercase tracking-wider ${getSugarHints(latest.bloodSugar).color}`}>{getSugarHints(latest.bloodSugar).label}</span>
               {renderTrend(latest.bloodSugar, previous?.bloodSugar, true)}
             </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:border-blue-200 hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><Scale className="w-5 h-5" /></div>
               <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md">Body Weight</span>
             </div>
             <div className="flex items-baseline space-x-1">
               <span className="text-3xl font-black text-gray-900 tabular-nums">{latest.weight || '--'}</span>
               <span className="text-sm font-medium text-gray-400 mb-1">kg</span>
             </div>
             <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
               <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Recorded Today</span>
               {renderTrend(latest.weight, previous?.weight, true)}
             </div>
          </div>
          
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Log Health Metrics
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Systolic</label>
                  <input type="number" required value={formData.systolic} onChange={e => setFormData({...formData, systolic: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-inner" placeholder="120" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Diastolic</label>
                  <input type="number" required value={formData.diastolic} onChange={e => setFormData({...formData, diastolic: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-inner" placeholder="80" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center"><Heart className="w-3.5 h-3.5 mr-1" /> Heart Rate</label>
                <input type="number" required value={formData.heartRate} onChange={e => setFormData({...formData, heartRate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-inner" placeholder="72 bpm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center"><Droplets className="w-3.5 h-3.5 mr-1" /> Blood Sugar</label>
                <input type="number" step="0.1" value={formData.bloodSugar} onChange={e => setFormData({...formData, bloodSugar: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-inner" placeholder="95.5 mg/dL" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center"><Scale className="w-3.5 h-3.5 mr-1" /> Weight</label>
                <input type="number" step="0.1" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-inner" placeholder="70.5 kg" />
              </div>

              <button type="submit" disabled={loading} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5 pt-3">
                {loading ? 'Saving Metrics...' : 'Securely Save Vitals'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Master History Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[500px]">
             <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center">
               <Clock className="w-6 h-6 mr-2 text-blue-600" /> Historical Timeline
             </h2>
             
             {loading && vitalsList.length === 0 ? (
                <div className="h-64 flex items-center justify-center"><Activity className="w-10 h-10 text-blue-500 animate-pulse" /></div>
             ) : vitalsList.length > 0 ? (
               <div className="relative border-l-2 border-gray-100 ml-4 md:ml-6 pl-6 md:pl-10 space-y-8">
                 {vitalsList.map((vital, index) => {
                   const bpInfo = getBPHints(vital.systolic, vital.diastolic);
                   const isCritical = bpInfo.label.includes('Stage 2') || bpInfo.label.includes('Stage 1') || (vital.heartRate && vital.heartRate > 100);
                   const Icon = isCritical ? AlertCircle : CheckCircle2;
                   
                   return (
                     <div key={vital.$id} className="relative group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 50}ms`}}>
                       {/* Timeline Dot */}
                       <div className={`absolute -left-[35px] md:-left-[51px] top-6 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110 ${isCritical ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                         <Icon className="w-4 h-4 text-white" />
                       </div>
                       
                       {/* Card Body */}
                       <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 group-hover:border-blue-200 group-hover:shadow-md transition-all">
                         <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 border-b border-gray-50 pb-4 gap-2">
                           <span className="text-sm font-bold text-gray-700 flex items-center uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-lg w-max">
                             <Clock className="w-4 h-4 mr-2 text-gray-400" />
                             {new Date(vital.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                           </span>
                           {bpInfo.label !== 'No Data' && (
                             <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-lg uppercase shadow-sm ${bpInfo.bg} ${bpInfo.color}`}>
                               {bpInfo.label} BP
                             </span>
                           )}
                         </div>
                         
                         {/* Stats Grid */}
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider flex items-center"><Activity className="w-3 h-3 mr-1 text-indigo-400" /> Blood Pressure</p>
                             <p className="text-xl font-black text-gray-900 tabular-nums">{vital.systolic || '--'} <span className="text-sm text-gray-400 font-medium">/ {vital.diastolic || '--'}</span></p>
                           </div>
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider flex items-center"><Heart className="w-3 h-3 mr-1 text-rose-400" /> Heart Rate</p>
                             <p className="text-xl font-black text-gray-900 tabular-nums">{vital.heartRate || '--'} <span className="text-xs text-gray-400 font-medium">bpm</span></p>
                           </div>
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider flex items-center"><Droplets className="w-3 h-3 mr-1 text-blue-400" /> Blood Sugar</p>
                             <p className="text-xl font-black text-gray-900 tabular-nums">{vital.bloodSugar || '--'} <span className="text-xs text-gray-400 font-medium">mg/dL</span></p>
                           </div>
                           <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider flex items-center"><Scale className="w-3 h-3 mr-1 text-emerald-400" /> Weight</p>
                             <p className="text-xl font-black text-gray-900 tabular-nums">{vital.weight || '--'} <span className="text-xs text-gray-400 font-medium">kg</span></p>
                           </div>
                         </div>
                       </div>
                       
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-4">
                 <Activity className="w-12 h-12 mb-4 opacity-20 text-gray-500" />
                 <p className="text-sm font-semibold text-gray-600">No vitals registered</p>
                 <p className="text-xs mt-1 text-gray-400 max-w-sm text-center">Track your blood pressure and heart rate using the secure form on the left.</p>
               </div>
             )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
