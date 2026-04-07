import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { Query } from 'appwrite';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'User';
  
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      if (!user) return;
      try {
        const res = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.vitalsCollectionId,
          [Query.equal('userId', user.$id), Query.orderDesc('date'), Query.limit(1)]
        );
        if (res.documents.length > 0) {
          setLatestVitals(res.documents[0]);
        }
      } catch (error) {
        console.error('Failed to fetch latest vitals', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, [user]);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName} 👋</h1>
      <p className="text-gray-500">Here's your latest health summary overview.</p>
      
      {loading ? (
        <div className="flex justify-center py-12"><Activity className="w-8 h-8 text-blue-500 animate-pulse" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 text-sm font-medium">Heart Rate</h3>
              {latestVitals && latestVitals.heartRate ? (
                <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${latestVitals.heartRate > 100 ? 'text-orange-700 bg-orange-100' : 'text-green-700 bg-green-100'}`}>
                  {latestVitals.heartRate > 100 ? 'Elevated' : 'Normal'}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-baseline text-3xl font-bold text-gray-900">
              {latestVitals ? latestVitals.heartRate : '--'}
              <span className="ml-1 text-sm font-medium text-gray-500">bpm</span>
            </div>
            {latestVitals && <p className="text-xs text-gray-400 mt-2">Logged {new Date(latestVitals.date).toLocaleDateString()}</p>}
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 text-sm font-medium">Blood Pressure</h3>
              {latestVitals && latestVitals.systolic ? (
                <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${latestVitals.systolic > 120 ? 'text-orange-700 bg-orange-100' : 'text-green-700 bg-green-100'}`}>
                  {latestVitals.systolic > 120 ? 'Elevated' : 'Optimal'}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-baseline text-3xl font-bold text-gray-900">
              {latestVitals ? `${latestVitals.systolic}/${latestVitals.diastolic}` : '--/--'}
              <span className="ml-1 text-sm font-medium text-gray-500">mmHg</span>
            </div>
            {latestVitals && <p className="text-xs text-gray-400 mt-2">Logged {new Date(latestVitals.date).toLocaleDateString()}</p>}
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg shadow-blue-200 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
            <h3 className="text-blue-100 text-sm font-medium relative z-10">AI Health Insights</h3>
            <p className="mt-4 text-sm text-blue-50 relative z-10 leading-relaxed">
              Ready to analyze your latest data? Head over to the reports section to generate a personalized AI summary.
            </p>
            <Link to="/reports" className="inline-block mt-6 bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors relative z-10">
              Generate Report
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
