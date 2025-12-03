import React, { useState } from 'react';
import { Platform } from '../types';
import { PLATFORM_CONFIGS } from '../constants';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlatforms: Platform[];
  onApply: (ops: BulkOperations) => void;
  totalFiles: number;
}

export interface BulkOperations {
  platforms: Platform[];
  findText: string;
  replaceText: string;
  prefix: string;
  suffix: string;
  addKeywords: string;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, selectedPlatforms, onApply, totalFiles }) => {
  const [platforms, setPlatforms] = useState<Platform[]>(selectedPlatforms);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [addKeywords, setAddKeywords] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      platforms,
      findText,
      replaceText,
      prefix,
      suffix,
      addKeywords
    });
    onClose();
  };

  const togglePlatform = (p: Platform) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  return (
     <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bulk Edit Metadata</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
           {/* Platforms */}
           <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Apply to Platforms</label>
              <div className="flex flex-wrap gap-2">
                 {(Object.keys(PLATFORM_CONFIGS) as Platform[]).map(p => (
                    <button
                       key={p}
                       onClick={() => togglePlatform(p)}
                       className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          platforms.includes(p) 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500/50 dark:text-indigo-300' 
                          : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                       }`}
                    >
                       {PLATFORM_CONFIGS[p].name}
                    </button>
                 ))}
              </div>
           </div>

           {/* Title Ops */}
           <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Title Operations</h3>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Find</label>
                    <input type="text" value={findText} onChange={e => setFindText(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Text to find..." />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Replace With</label>
                    <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Replacement..." />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Add Prefix</label>
                    <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Start of title..." />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Add Suffix</label>
                    <input type="text" value={suffix} onChange={e => setSuffix(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="End of title..." />
                 </div>
              </div>
           </div>

           {/* Keywords Ops */}
           <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Keywords</h3>
              <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500 uppercase">Add Keywords</label>
                 <textarea value={addKeywords} onChange={e => setAddKeywords(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Comma, separated, keywords..." />
              </div>
           </div>

           <div className="pt-6">
              <button onClick={handleApply} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                 Apply to {totalFiles} Files
              </button>
           </div>
        </div>
      </div>
     </div>
  );
};

export default BulkEditModal;