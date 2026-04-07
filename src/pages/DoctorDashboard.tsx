import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Activity, FileText, ExternalLink, Clock } from 'lucide-react';
import { databases, storage, APPWRITE_CONFIG } from '../lib/appwrite';
import { Query } from 'appwrite';
import type { Models } from 'appwrite';

interface Props {
  initialToken?: string;
  isSharedView?: boolean;
}

interface VitalDocument extends Models.Document {
  userId: string;
  heartRate: number;
  systolic: number;
  diastolic: number;
  weight: number;
  bloodSugar: number;
  date: string;
}

interface RecordDocument extends Models.Document {
  userId: string;
  fileId: string;
  type: string;
  name: string;
}

export default function DoctorDashboard({ initialToken = '', isSharedView = false }: Props) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Doctor';

  const [searchToken, setSearchToken] = useState(initialToken);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Patient Record');
  const [loading, setLoading] = useState(false);
  const [vitals, setVitals] = useState<VitalDocument[]>([]);
  const [records, setRecords] = useState<RecordDocument[]>([]);

  const handleSearch = async (tokenToUse: string) => {
    if (!tokenToUse) return;
    setLoading(true);
    try {
      let decodedUserId = '';
      const payloadStr = atob(tokenToUse);
      
      try {
        const payload = JSON.parse(payloadStr);
        if (payload.e && Date.now() > payload.e) {
          alert('This shared link has expired. Please request a new link from your patient.');
          setLoading(false);
          return;
        }
        
        // Remote Invocation Check against the Database
        if (payload.j) {
           try {
              await databases.getDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.linksCollectionId, payload.j);
           } catch {
              alert('This shared link has been revoked by the patient.');
              setLoading(false);
              return;
           }
        }
        
        decodedUserId = payload.i;
        if (payload.n) {
          setPatientName(payload.n);
        }
      } catch {
        decodedUserId = payloadStr;
      }

      setPatientId(decodedUserId);
      
      const vRes = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.vitalsCollectionId,
        [Query.equal('userId', decodedUserId), Query.orderDesc('date'), Query.limit(10)]
      );
      setVitals(vRes.documents as unknown as VitalDocument[]);

      const rRes = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.docsCollectionId,
        [Query.equal('userId', decodedUserId), Query.orderDesc('$createdAt'), Query.limit(10)]
      );
      setRecords(rRes.documents as unknown as RecordDocument[]);
      
    } catch (error) {
      console.error('Failed to resolve patient token', error);
      alert('Invalid patient token. Cannot fetch records.');
      setPatientId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      handleSearch(initialToken);
    }
  }, [initialToken]);

  const getFileViewUrl = (fileId: string) => {
    return storage.getFileView(APPWRITE_CONFIG.recordsBucketId, fileId).toString();
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className={isSharedView ? "bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between" : ""}>
        <div>
          <h1 className={`${isSharedView ? 'text-4xl' : 'text-3xl'} font-extrabold text-gray-900 tracking-tight`}>
            {isSharedView ? (patientName !== 'Patient Record' ? patientName : 'Patient Health Vault') : `Dr. ${firstName}'s Portal`}
          </h1>
          <p className={`${isSharedView ? 'text-lg mt-3' : 'text-sm mt-2'} text-gray-500 font-medium`}>
            {isSharedView 
              ? 'Authorized Medical Record & Vitals Access. Data is read-only and explicitly shared by the patient.' 
              : 'Manage and assist your connected patients.'}
          </p>
        </div>
        
        {isSharedView && patientId && (
          <div className="mt-6 md:mt-0 flex items-center bg-blue-50 px-4 py-3 rounded-2xl border border-blue-100 gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
               <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Patient</p>
              <p className="text-sm font-bold text-blue-900">{patientName !== 'Patient Record' ? patientName : patientId.substring(0, 8) + '...'}</p>
            </div>
          </div>
        )}
      </div>

      {!isSharedView && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 flex flex-col md:flex-row items-center justify-between">
           <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold text-blue-900">Enter Patient Access Token</h3>
              <p className="text-sm text-blue-700 mt-1 max-w-lg">Enter the secure link token provided by your patient to instantly access their medical records and vitals timeline.</p>
           </div>
           <div className="flex w-full md:w-auto md:max-w-sm">
              <input 
                type="text" 
                value={searchToken}
                onChange={e => setSearchToken(e.target.value)}
                placeholder="e.g. eHl0ZW..." 
                className="flex-1 rounded-l-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200 text-sm" 
              />
              <button 
                onClick={() => handleSearch(searchToken)}
                disabled={loading || !searchToken}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-r-xl font-medium transition-colors border border-blue-600 disabled:opacity-50"
              >
                {loading ? <Activity className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5"/>}
              </button>
           </div>
        </div>
      )}

      {patientId ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center relative z-10">
                <div className="bg-blue-100 p-2.5 rounded-xl mr-4 shadow-inner">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                Vitals Timeline
              </h2>
              {vitals.length > 0 ? (
                <div className="space-y-3 relative z-10">
                  {vitals.map(v => (
                    <div key={v.$id} className="relative z-10 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300">
                       <div className="flex justify-between items-start mb-3">
                         <p className="font-bold text-gray-900 flex items-center">
                           <Clock className="w-4 h-4 mr-2 text-gray-400" />
                           {new Date(v.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                         </p>
                       </div>
                       <div className="grid grid-cols-2 gap-3 mt-2">
                         <div className="bg-blue-50/80 px-3 py-2 rounded-xl flex items-center justify-between">
                           <span className="text-xs font-semibold text-blue-600/70 uppercase">Blood Pres</span>
                           <span className="font-bold text-blue-900">{v.systolic}/{v.diastolic}</span>
                         </div>
                         <div className="bg-rose-50/80 px-3 py-2 rounded-xl flex items-center justify-between">
                           <span className="text-xs font-semibold text-rose-600/70 uppercase">Heart Rate</span>
                           <span className="font-bold text-rose-900">{v.heartRate} <span className="text-[10px] font-normal">bpm</span></span>
                         </div>
                         <div className="bg-emerald-50/80 px-3 py-2 rounded-xl flex items-center justify-between">
                           <span className="text-xs font-semibold text-emerald-600/70 uppercase">Glucose</span>
                           <span className="font-bold text-emerald-900">{v.bloodSugar} <span className="text-[10px] font-normal">mg/dL</span></span>
                         </div>
                         <div className="bg-amber-50/80 px-3 py-2 rounded-xl flex items-center justify-between">
                           <span className="text-xs font-semibold text-amber-600/70 uppercase">Weight</span>
                           <span className="font-bold text-amber-900">{v.weight} <span className="text-[10px] font-normal">kg</span></span>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 flex flex-col items-center py-8">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No vitals recorded by this patient.</p>
                </div>
              )}
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center relative z-10">
                <div className="bg-indigo-100 p-2.5 rounded-xl mr-4 shadow-inner">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                Clinical Documents
              </h2>
              {records.length > 0 ? (
                <div className="space-y-3 relative z-10">
                  {records.map(r => (
                    <div key={r.$id} className="relative z-10 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 flex justify-between items-center group/card">
                       <div className="flex items-center">
                         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mr-4 border border-indigo-100/50 group-hover/card:scale-110 transition-transform">
                           <FileText className="w-6 h-6 text-indigo-500" />
                         </div>
                         <div>
                           <p className="font-bold text-gray-900 text-base group-hover/card:text-indigo-700 transition-colors">{r.name}</p>
                           <div className="flex items-center mt-1.5">
                             <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md mr-2">{r.type.replace('_', ' ')}</span>
                             <span className="text-xs font-medium text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1 opacity-70"/> {new Date(r.$createdAt).toLocaleDateString()}</span>
                           </div>
                         </div>
                       </div>
                       <a href={getFileViewUrl(r.fileId)} target="_blank" rel="noreferrer" className="shrink-0 flex items-center px-5 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm shadow-indigo-100" title="View Document">
                         View <ExternalLink className="w-4 h-4 ml-2" />
                       </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 flex flex-col items-center py-8">
                  <FileText className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No documents uploaded by this patient.</p>
                </div>
              )}
            </div>
         </div>
      ) : (
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
            {loading ? (
               <>
                 <div className="relative">
                   <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                   <Activity className="w-16 h-16 text-blue-600 mb-6 relative z-10 animate-bounce" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Decrypting Health Data</h3>
                 <p className="text-gray-500 max-w-sm">Securely fetching patient vitals and documents from the encrypted vault...</p>
               </>
            ) : (
               <>
                 <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                   <Users className="w-10 h-10 text-gray-400" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Awaiting Patient Token</h3>
                 <p className="text-gray-500 max-w-sm">Please insert a valid encrypted sharing token to access the patient's medical history.</p>
               </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
