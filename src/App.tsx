import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Vitals from './pages/Vitals';
// @ts-expect-error Ignoring Vite path cache delay
import Records from './pages/Records';
import Reports from './pages/Reports';
import ShareAccess from './pages/ShareAccess';
// @ts-expect-error Ignoring Vite path cache delay
import Medications from './pages/Medications';
import SharedView from './pages/SharedView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { InstallPrompt } from './components/InstallPrompt';
import { Activity } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Activity className="w-10 h-10 text-blue-600 animate-pulse mb-4" />
        <p className="text-gray-500 font-medium">Loading HealthVault...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/shared/:token" element={<SharedView />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vitals" element={<Vitals />} />
        <Route path="records" element={<Records />} />
        <Route path="reports" element={<Reports />} />
        <Route path="share" element={<ShareAccess />} />
        <Route path="medications" element={<Medications />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <InstallPrompt />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;