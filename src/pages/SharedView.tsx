import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { account } from '../lib/appwrite';
import DoctorDashboard from './DoctorDashboard';
import { ShieldCheck } from 'lucide-react';

export default function SharedView() {
  const { token } = useParams();
  const { user, loading, checkSession } = useAuth();
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      if (!loading) {
        if (!user) {
          try {
            await account.createAnonymousSession();
            await checkSession();
          } catch (e) {
             console.error('Failed to create anonymous session', e);
          }
        }
        setSessionLoading(false);
      }
    };
    initSession();
  }, [loading, user, checkSession]);

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center relative z-10 border border-gray-100 max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Secure Link</h2>
          <p className="text-gray-500 font-medium text-sm text-center mb-6">Authenticating medical access token and establishing secure connection...</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-[progress_2s_ease-in-out_infinite] w-full origin-left"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">

      {/* Verification Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b border-blue-700 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center text-sm font-medium space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-blue-200" />
              <span>Verified Medical Professional Access</span>
            </div>
            <span className="hidden sm:inline text-blue-300">|</span>
            <div className="flex items-center text-blue-100">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Read-Only Session Active
            </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <DoctorDashboard initialToken={token} isSharedView={true} />
      </main>
    </div>
  );
}
