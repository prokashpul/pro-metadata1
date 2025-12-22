
import React, { useState } from 'react';
import { AiProvider } from '../types';

interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKeys: string[];
  mistralKeys: string[];
  onAddKey: (provider: AiProvider, key: string) => void;
  onRemoveKey: (provider: AiProvider, index: number) => void;
  onClearKeys: (provider: AiProvider) => void;
}

const ApiModal: React.FC<ApiModalProps> = ({ 
  isOpen, onClose, geminiKeys, mistralKeys, onAddKey, onRemoveKey, onClearKeys 
}) => {
  const [activeTab, setActiveTab] = useState<AiProvider>('gemini');
  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (inputVal.trim().length > 5) {
      onAddKey(activeTab, inputVal.trim());
      setInputVal('');
    }
  };

  let currentKeys: string[] = [];
  if (activeTab === 'gemini') currentKeys = geminiKeys;
  else if (activeTab === 'mistral') currentKeys = mistralKeys;

  const getThemeColors = (provider: AiProvider) => {
    switch (provider) {
      case 'gemini': return 'text-indigo-600 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400';
      case 'mistral': return 'text-orange-600 border-orange-600 dark:text-orange-400 dark:border-orange-400';
      default: return '';
    }
  };

  const getButtonColor = (provider: AiProvider) => {
    switch (provider) {
      case 'gemini': return 'bg-indigo-600 hover:bg-indigo-700';
      case 'mistral': return 'bg-orange-600 hover:bg-orange-700';
      default: return 'bg-slate-600';
    }
  };

  const getDescription = (provider: AiProvider) => {
    switch (provider) {
      case 'gemini': return "Generate metadata using Google's Gemini Flash model. Fast and multimodal.";
      case 'mistral': return "Generate metadata using Mistral's Pixtral 12B model. High quality open-weights model.";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">API Key Management</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'gemini'
                ? getThemeColors('gemini')
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Google Gemini
          </button>
          <button
            onClick={() => setActiveTab('mistral')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'mistral'
                ? getThemeColors('mistral')
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Mistral AI
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {getDescription(activeTab)}
            </p>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`Paste ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Key...`} 
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={handleAdd}
              disabled={!inputVal}
              className={`text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors ${getButtonColor(activeTab)}`}
            >
              Add
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">{activeTab} Keys ({currentKeys.length})</h3>
              {currentKeys.length > 0 && (
                <button onClick={() => onClearKeys(activeTab)} className="text-xs text-red-600 hover:text-red-700 font-medium">Clear All</button>
              )}
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentKeys.length === 0 ? (
                <p className="text-slate-400 text-sm italic text-center py-4">No keys added yet.</p>
              ) : (
                currentKeys.map((key, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {key.substring(0, 8)}...{key.substring(key.length - 4)}
                    </span>
                    <button 
                      onClick={() => onRemoveKey(activeTab, idx)}
                      className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
             <a 
               href={
                 activeTab === 'gemini' ? "https://aistudio.google.com/app/apikey" : 
                 "https://console.mistral.ai/api-keys/"
               } 
               target="_blank" 
               rel="noreferrer" 
               className="text-xs text-indigo-500 hover:text-indigo-400 inline-flex items-center gap-1"
             >
               <span>Get a {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} API key</span>
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiModal;