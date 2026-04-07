import { Bell, Settings, ChevronDown, User, LogOut, Check, Trash2, Info, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ProfileModal } from '../profile/ProfileModal';
import { GlobalSearch } from './GlobalSearch';

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'profile' | 'settings'>('profile');

  const openModal = (tab: 'profile' | 'settings') => {
    setModalTab(tab);
    setIsModalOpen(true);
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };
  
  const role = (user?.prefs as any)?.role || 'patient';
  const roleColors = role === 'doctor' 
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <>
    <header className="h-16 lg:h-20 bg-white shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors mr-2"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-4 border-r border-gray-100 pr-6">
          <GlobalSearch />
          
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors focus:outline-none"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            
            {showNotifs && (
              <div className="
                fixed top-20 left-3 right-3 z-50
                lg:absolute lg:fixed-none lg:top-auto lg:left-auto lg:right-0 lg:mt-2 lg:w-80
                bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden
                animate-in fade-in slide-in-from-top-2 duration-200
              ">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  <div className="flex space-x-2">
                     {unreadCount > 0 && (
                       <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors">Mark all read</button>
                     )}
                     <button onClick={clearAll} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => markAsRead(n.id)}
                        className={`p-4 border-b border-gray-50 flex items-start space-x-3 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                      >
                        <div className={`p-2 rounded-full flex-shrink-0 ${n.type === 'success' ? 'bg-green-100 text-green-600' : n.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {n.type === 'success' ? <Check className="w-4 h-4"/> : <Info className="w-4 h-4"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-gray-900 ${!n.read ? 'font-semibold text-blue-900' : ''}`}>{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.time).toLocaleString()}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                      <Bell className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">No notifications yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 hover:bg-gray-50 p-1.5 rounded-xl transition-colors focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name || 'User'}</p>
              <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 border ${roleColors}`}>
                {role}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-gray-50 mb-2">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button onClick={() => openModal('profile')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-colors">
                <User className="w-4 h-4 mr-3" /> My Profile
              </button>
              <button onClick={() => openModal('settings')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-colors">
                <Settings className="w-4 h-4 mr-3" /> Account Settings
              </button>
              <div className="h-px bg-gray-100 my-2"></div>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors font-medium"
              >
                <LogOut className="w-4 h-4 mr-3" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    <ProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultTab={modalTab} />
    </>
  );
}
