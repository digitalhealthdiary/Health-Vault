import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, APPWRITE_CONFIG } from '../lib/appwrite';
import { Query } from 'appwrite';
import { Link2, Copy, CheckCircle, Clock, Plus, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface ShareLink {
  id: string;
  name: string;
  token: string;
  createdAt: number;
  expiresAt: number | null;
}

export default function ShareAccess() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [links, setLinks] = useState<ShareLink[]>([]);
  
  const [linkName, setLinkName] = useState('');
  const [expiresIn, setExpireIn] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.$id) {
      const fetchLinks = async () => {
        try {
          const res = await databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.linksCollectionId, [
            Query.equal('userId', user.$id)
          ]);
          const formatted = res.documents.map(d => ({
            id: d.$id,
            name: d.name,
            token: d.token,
            createdAt: new Date(d.$createdAt).getTime(),
            expiresAt: d.expiresAt ? d.expiresAt * 1000 : null
          }));
          setLinks(formatted);
        } catch (error) {
          console.error('Failed to load active links', error);
        }
      };
      fetchLinks();
    }
  }, [user]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    try {
      const expTime = expiresIn === -1 ? null : Date.now() + (expiresIn * 60 * 60 * 1000);
      const jti = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
      
      const payload = {
        i: user.$id,
        n: user.name, // Include patient name inside token
        e: expTime,
        j: jti
      };
      const token = btoa(JSON.stringify(payload));
      
      const newLinkName = linkName || `Link for ${new Date().toLocaleDateString()}`;
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.linksCollectionId,
        jti,
        {
          userId: user.$id,
          name: newLinkName,
          token,
          expiresAt: expTime ? Math.floor(expTime / 1000) : null
        }
      );

      const newLink: ShareLink = {
        id: jti,
        name: newLinkName,
        token,
        createdAt: Date.now(),
        expiresAt: expTime
      };
      
      setLinks(prev => [newLink, ...prev]);
      
      setLinkName('');
      addNotification('Link Created', 'A new secure access link has been generated successfully.', 'success');
      
    } catch (error) {
      console.error('Failed to create link', error);
      addNotification('Creation Failed', 'Failed to generate link. Try again.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLink = async (id: string) => {
    if (!confirm('Remove this link from your dashboard? Once revoked, any doctor using this URL will immediately lose access to your records.')) return;
    try {
      await databases.deleteDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.linksCollectionId, id);
      setLinks(prev => prev.filter(l => l.id !== id));
      addNotification('Link Revoked', 'The share link was permanently deleted.', 'success');
    } catch (error) {
      console.error('Failed to remove link', error);
      addNotification('Removal Failed', 'Error removing the link.', 'warning');
    }
  };

  const copyToClipboard = (token: string, id: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Share Access Hub</h1>
          <p className="text-gray-500 mt-1">Generate and manage secure reading links for your healthcare providers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Create Link Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              Generate New Link
            </h2>
            
            <form onSubmit={handleCreateLink} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider or Purpose</label>
                <input 
                  type="text" 
                  value={linkName} 
                  onChange={e => setLinkName(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" 
                  placeholder="e.g. Dr. Sarah Smith" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" /> Auto-Expiration
                </label>
                <select 
                  value={expiresIn} 
                  onChange={e => setExpireIn(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value={1}>Expire in 1 Hour</option>
                  <option value={24}>Expire in 24 Hours</option>
                  <option value={168}>Expire in 7 Days</option>
                  <option value={-1}>Never Expire</option>
                </select>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-start">
                <ShieldAlert className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 font-medium">Anyone with this link can view your vitals and documents. Share responsibly.</p>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md disabled:opacity-50 hover:-translate-y-0.5 mt-2">
                {loading ? 'Generating...' : 'Create Secure Link'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Existing Links List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Link2 className="w-5 h-5 mr-3 text-gray-400" /> Active Shared Links
            </h2>
            
            {links && links.length > 0 ? (
              <div className="space-y-4">
                {links.map((link) => {
                  const isExpired = link.expiresAt !== null && Date.now() > link.expiresAt;
                  
                  return (
                    <div key={link.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isExpired ? 'bg-red-50/30 border-red-100 opacity-60' : 'bg-gray-50 border-gray-100 hover:border-blue-200'}`}>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className={`font-semibold text-sm md:text-base ${isExpired ? 'text-red-800 line-through' : 'text-gray-900'}`}>{link.name}</h3>
                          {isExpired && <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-md">Expired</span>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500 mt-2">
                          <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5" /> Created: {new Date(link.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center text-gray-600 font-medium">
                            <Clock className="w-3.5 h-3.5 mr-1.5" /> 
                            {link.expiresAt ? `Expires: ${new Date(link.expiresAt).toLocaleString()}` : 'Never Expires'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-200">
                        <button 
                          onClick={() => copyToClipboard(link.token, link.id)}
                          disabled={isExpired}
                          className="flex-1 md:flex-none flex items-center justify-center bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {copiedId === link.id ? <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                          {copiedId === link.id ? 'Copied' : 'Copy Token'}
                        </button>
                        <button 
                          onClick={() => handleRemoveLink(link.id)}
                          className="p-2.5 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-400 rounded-xl transition-all bg-white shadow-sm"
                          title="Remove from Dashboard"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Link2 className="w-8 h-8 text-blue-200" />
                </div>
                <p className="text-sm font-medium text-gray-600">No active links found</p>
                <p className="text-xs mt-1 text-gray-400 max-w-sm text-center">Use the form on the left to create a new shared link for your doctors and manage it here.</p>
              </div>
            )}
            
          </div>
        </div>
        
      </div>
    </div>
  );
}
