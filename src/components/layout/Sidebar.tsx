import { Activity, FileText, Home, Link as LinkIcon, PieChart, Pill, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const patientItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Vitals', path: '/vitals' },
  { icon: Pill, label: 'Medications', path: '/medications' },
  { icon: FileText, label: 'Records', path: '/records' },
  { icon: PieChart, label: 'Reports', path: '/reports' },
  { icon: LinkIcon, label: 'Share Access', path: '/share' },
];

const doctorItems = [
  { icon: Home, label: 'Doctor Hub', path: '/' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const role = (user?.prefs as Record<string, unknown>)?.role as string || 'patient';
  const navItems = role === 'doctor' ? doctorItems : patientItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          w-64 h-screen bg-white shadow-[2px_0_12px_-4px_rgba(0,0,0,0.12)] flex flex-col
          fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 lg:h-20 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center mr-3 shadow-sm">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              HealthVault
            </span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}   // close drawer on navigate (mobile)
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

      </aside>
    </>
  );
}
