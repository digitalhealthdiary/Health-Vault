import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { databases, storage, APPWRITE_CONFIG } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { FileText, Upload, Trash2, Eye, Activity, Search, Pill, Stethoscope, FilePlus, Filter, X } from 'lucide-react';

export default function Records() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('prescription');
  const [docName, setDocName] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.docsCollectionId,
        [
          Query.equal('userId', user.$id),
          Query.orderDesc('$createdAt')
        ]
      );
      setRecords(response.documents);
    } catch (error) {
      console.error('Failed to fetch records', error);
      addNotification('Error', 'Failed to load medical records', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !docName) return;
    
    setUploading(true);
    try {
      const uploadedFile = await storage.createFile(
        APPWRITE_CONFIG.recordsBucketId,
        ID.unique(),
        file
      );
      
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.docsCollectionId,
        ID.unique(),
        {
          userId: user.$id,
          fileId: uploadedFile.$id,
          type: docType,
          name: docName
        }
      );
      
      setFile(null);
      setDocName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      addNotification('Document Uploaded', `${docName} has been securely saved to your medical vault.`, 'success');
      fetchRecords();
    } catch (error) {
      console.error('Upload failed', error);
      addNotification('Upload Failed', 'There was an error saving your document.', 'warning');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileId: string) => {
    if (!confirm('Are you sure you want to permanently delete this record?')) return;
    try {
      await storage.deleteFile(APPWRITE_CONFIG.recordsBucketId, fileId);
      await databases.deleteDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.docsCollectionId, docId);
      setRecords(records.filter(r => r.$id !== docId));
      addNotification('Record Deleted', 'The document has been permanently removed.', 'info');
    } catch (error) {
      console.error('Delete failed', error);
      addNotification('Delete Failed', 'Failed to remove the document.', 'warning');
    }
  };

  const getFileViewUrl = (fileId: string) => {
    return storage.getFileView(APPWRITE_CONFIG.recordsBucketId, fileId).toString();
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'prescription': return <Pill className="w-5 h-5 text-purple-600" />;
      case 'lab_report': return <Activity className="w-5 h-5 text-blue-600" />;
      case 'doctor_note': return <Stethoscope className="w-5 h-5 text-emerald-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBgForType = (type: string) => {
    switch(type) {
      case 'prescription': return 'bg-purple-100 border-purple-200 text-purple-600';
      case 'lab_report': return 'bg-blue-100 border-blue-200 text-blue-600';
      case 'doctor_note': return 'bg-emerald-100 border-emerald-200 text-emerald-600';
      default: return 'bg-gray-100 border-gray-200 text-gray-600';
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'all' || doc.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [records, searchTerm, activeFilter]);

  const filterOptions = [
    { id: 'all', label: 'All Records' },
    { id: 'prescription', label: 'Prescriptions' },
    { id: 'lab_report', label: 'Lab Reports' },
    { id: 'doctor_note', label: 'Doctor Notes' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Vault</h1>
          <p className="text-gray-500 mt-1">Upload, search, and manage your health documents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-blue-600" />
              Upload New Record
            </h2>
            
            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                <input 
                  type="text" required 
                  value={docName} onChange={e => setDocName(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm" 
                  placeholder="e.g. Blood Test Results" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Category</label>
                <select 
                  value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="prescription">Prescription</option>
                  <option value="lab_report">Lab Report</option>
                  <option value="doctor_note">Doctor Note</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
                <div className="relative group overflow-hidden">
                  <div className="absolute inset-0 bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-xl group-hover:bg-blue-100 transition-colors pointer-events-none flex flex-col items-center justify-center p-4">
                    <FilePlus className="w-6 h-6 text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-blue-700 truncate w-full flex justify-center">{file ? file.name : 'Click or drop file here'}</span>
                    <span className="text-[10px] text-blue-500 font-medium mt-1 uppercase tracking-wider">PDF, JPG, PNG up to 10MB</span>
                  </div>
                  <input 
                    type="file" required ref={fileInputRef}
                    onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full h-32 opacity-0 cursor-pointer relative z-10" 
                    accept=".pdf,image/*"
                  />
                </div>
              </div>

              <button type="submit" disabled={uploading || !file} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all shadow-md disabled:opacity-50 hover:-translate-y-0.5 pt-3 mt-4">
                {uploading ? 'Securely Uploading...' : 'Upload to Vault'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Records List */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Enhanced Toolbars */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col gap-4">
              <div className="relative w-full">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search your records..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm transition-all shadow-inner"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="w-full flex overflow-x-auto pb-1 scrollbar-hide">
                <div className="flex w-full bg-gray-50 p-1 rounded-xl border border-gray-200 min-w-max">
                  {filterOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setActiveFilter(opt.id)}
                      className={`flex-1 px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-center ${
                        activeFilter === opt.id 
                          ? 'bg-white text-blue-700 shadow-sm border border-gray-200' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 transparent border border-transparent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
             {loading ? (
               <div className="flex justify-center items-center h-64"><Activity className="w-8 h-8 text-blue-500 animate-pulse" /></div>
             ) : filteredRecords.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {filteredRecords.map((doc) => (
                   <div key={doc.$id} className="border border-gray-100 rounded-2xl p-5 flex flex-col hover:border-blue-200 hover:shadow-md transition-all group bg-white shadow-sm">
                     <div className="flex justify-between items-start mb-4">
                       <div className={`p-3 rounded-xl border shadow-sm mix-blend-multiply ${getBgForType(doc.type)}`}>
                         {getIconForType(doc.type)}
                       </div>
                       <span className="text-[10px] font-bold tracking-wider px-2 py-1 bg-gray-100 text-gray-600 rounded-lg uppercase">
                         {doc.type.replace('_', ' ')}
                       </span>
                     </div>
                     
                     <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1 mb-1" title={doc.name}>{doc.name}</h3>
                     <p className="text-xs text-gray-400 font-medium">Added {new Date(doc.$createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                     
                     <div className="mt-6 flex flex-row items-center gap-2 pt-4 border-t border-gray-50">
                       <a 
                         href={getFileViewUrl(doc.fileId)} 
                         target="_blank" rel="noopener noreferrer"
                         className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2.5 rounded-xl text-xs text-center transition-all flex justify-center items-center"
                       >
                         <Eye className="w-3.5 h-3.5 mr-1.5" /> View Target
                       </a>
                       <button onClick={() => handleDelete(doc.$id, doc.fileId)} className="p-2.5 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-gray-400 rounded-xl transition-all bg-white" title="Delete record">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                 <Filter className="w-12 h-12 mb-3 opacity-20 text-gray-500" />
                 <p className="text-sm font-medium text-gray-600">No records found</p>
                 <p className="text-xs mt-1 text-gray-400">Try adjusting your filters or search term.</p>
               </div>
             )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
