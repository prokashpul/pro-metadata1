import React, { useState } from 'react';

interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: string[];
  onAddKey: (key: string) => void;
  onRemoveKey: (index: number) => void;
  onClearKeys: () => void;
}

const ApiModal: React.FC<ApiModalProps> = ({ 
  isOpen, onClose, apiKeys, onAddKey, onRemoveKey, onClearKeys 
}) => {
  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (inputVal.trim().length > 10) {
      onAddKey(inputVal.trim());
      setInputVal('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">API Key Management</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Why multiple keys?</strong> Adding multiple API keys creates a pool. The app rotates through them to distribute load and avoid rate limits. Keys are stored locally in your browser.
            </p>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Paste Gemini API Key (AIza...)" 
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={handleAdd}
              disabled={!inputVal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Your Keys ({apiKeys.length})</h3>
              {apiKeys.length > 0 && (
                <button onClick={onClearKeys} className="text-xs text-red-600 hover:text-red-700 font-medium">Clear All</button>
              )}
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {apiKeys.length === 0 ? (
                <p className="text-slate-400 text-sm italic text-center py-4">No keys added yet.</p>
              ) : (
                apiKeys.map((key, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {key.substring(0, 8)}...{key.substring(key.length - 4)}
                    </span>
                    <button 
                      onClick={() => onRemoveKey(idx)}
                      className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
               <span>Get a free API key from Google AI Studio</span>
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiModal;
