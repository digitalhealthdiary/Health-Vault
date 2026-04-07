import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, User, Settings, Shield, Mail } from 'lucide-react';
import { account } from '../../lib/appwrite';
import { useNotifications } from '../../context/NotificationContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'settings';
}

export function ProfileModal({ isOpen, onClose, defaultTab = 'profile' }: ProfileModalProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>(defaultTab);
  
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name === user.name) return;
    setLoading(true);
    try {
      await account.updateName(name);
      addNotification('Profile Updated', 'Your name has been updated successfully.', 'success');
      window.location.reload(); 
    } catch (error: any) {
      addNotification('Update Failed', error.message || 'Failed to update profile.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">Account Overview</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 bg-gray-50 border-r border-gray-100 p-4 space-y-1 flex md:flex-col md:space-x-0 space-x-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              <User className="w-4 h-4 mr-2" /> My Profile
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              <Settings className="w-4 h-4 mr-2" /> Settings
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                    <p className="text-gray-500 text-sm capitalize">{((user.prefs as any)?.role) || 'Patient'} Account</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 mr-4" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Email Address</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center">
                    <Shield className="w-5 h-5 text-gray-400 mr-4" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Account Status</p>
                      <p className="text-sm font-medium text-green-600 mt-0.5">{user.status ? 'Active' : 'Unverified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Profile</h3>
                  <form onSubmit={handleUpdateName} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-100 outline-none text-sm" 
                      />
                    </div>
                    <button disabled={loading || name === user.name} type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
                
                <hr className="border-gray-100" />
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Security</h3>
                  <p className="text-sm text-gray-500 mb-4">Update your password via the authentication system.</p>
                  <button onClick={() => { addNotification('Notice', 'Password reset links would be securely sent to ' + user.email, 'info') }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                    Change Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
