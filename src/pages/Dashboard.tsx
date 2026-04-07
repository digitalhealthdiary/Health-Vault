import { useAuth } from '../context/AuthContext';
import PatientDashboard from './PatientDashboard';
import DoctorDashboard from './DoctorDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  
  const role = (user?.prefs as any)?.role || 'patient';
  
  if (role === 'doctor') {
    return <DoctorDashboard />;
  }
  
  return <PatientDashboard />;
}
