import React, { useState, useEffect, useCallback } from 'react';
import { Platform, ProcessedFile, Metadata } from './types';
import { PLATFORM_CONFIGS, MAX_FILES } from './constants';
import { generateMetadataForPlatform } from './services/geminiService';
import { getThumbnail, downloadZip } from './services/fileService';
import ResultItem from './components/ResultItem';
import ApiModal from './components/ApiModal';
import BulkEditModal, { BulkOperations } from './components/BulkEditModal';

const App: React.FC = () => {
  // State
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [history, setHistory] = useState<ProcessedFile[][]>([]);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['adobe', 'shutterstock', 'freepik']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Derived State for Progress
  const processedCount = files.filter(f => f.status === 'complete' || f.status === 'error').length;
  const totalCount = files.length;
  const progressPercentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  // Initialize
  useEffect(() => {
    const savedKeys = localStorage.getItem('msp_api_keys');
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));
    
    const savedTheme = localStorage.getItem('msp_dark_mode');
    if (savedTheme === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Theme Toggle
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('msp_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('msp_dark_mode', 'false');
    }
  };

  // API Key Management
  const addApiKey = (key: string) => {
    const newKeys = [...apiKeys, key];
    setApiKeys(newKeys);
    localStorage.setItem('msp_api_keys', JSON.stringify(newKeys));
  };

  const removeApiKey = (index: number) => {
    const newKeys = [...apiKeys];
    newKeys.splice(index, 1);
    setApiKeys(newKeys);
    localStorage.setItem('msp_api_keys', JSON.stringify(newKeys));
  };

  const clearApiKeys = () => {
    setApiKeys([]);
    localStorage.removeItem('msp_api_keys');
  };

  // File Handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const allFiles = Array.from(e.target.files).slice(0, MAX_FILES) as File[];
      
      const getBaseName = (name: string) => name.substring(0, name.lastIndexOf('.'));
      const getExt = (name: string) => name.substring(name.lastIndexOf('.')).toLowerCase();

      // Separate Vectors and potential Previews
      const vectors = allFiles.filter(f => ['.ai', '.eps'].includes(getExt(f.name)));
      const others = allFiles.filter(f => !['.ai', '.eps'].includes(getExt(f.name)));
      
      const tasks: (() => Promise<ProcessedFile>)[] = [];
      const usedOthers = new Set<File>();

      // 1. Pair Vectors with Previews (same base name)
      for (const vec of vectors) {
        const baseName = getBaseName(vec.name);
        const match = others.find(o => 
          getBaseName(o.name) === baseName && 
          ['.jpg', '.jpeg', '.png'].includes(getExt(o.name))
        );

        if (match) usedOthers.add(match);

        tasks.push(async () => {
           const thumbFile = match || vec;
           return {
            id: crypto.randomUUID(),
            file: vec,
            previewFile: match, // Associate preview if found
            thumbnail: await getThumbnail(thumbFile), // Use preview for thumb if matched
            status: 'pending',
            platformMetadata: { adobe: null, shutterstock: null, freepik: null },
            activePlatform: selectedPlatforms[0] || 'adobe'
          };
        });
      }

      // 2. Process remaining files (videos, unmatched images)
      for (const other of others) {
        if (!usedOthers.has(other)) {
          tasks.push(async () => {
             return {
              id: crypto.randomUUID(),
              file: other,
              thumbnail: await getThumbnail(other),
              status: 'pending',
              platformMetadata: { adobe: null, shutterstock: null, freepik: null },
              activePlatform: selectedPlatforms[0] || 'adobe'
            };
          });
        }
      }

      const processedItems = await Promise.all(tasks.map(t => t()));
      setFiles(prev => [...prev, ...processedItems]);
      e.target.value = '';
    }
  };

  const handlePreviewUpload = async (id: string, file: File) => {
     const thumb = await getThumbnail(file);
     setFiles(prev => prev.map(f => f.id === id ? { ...f, previewFile: file, thumbnail: thumb } : f));
  };

  // Single File Regeneration
  const handleRegenerate = async (id: string) => {
    if (apiKeys.length === 0) {
      setIsModalOpen(true);
      return;
    }

    const item = files.find(f => f.id === id);
    if (!item) return;

    // Set to processing
    setFiles(current => current.map(f => f.id === id ? { ...f, status: 'processing', error: undefined } : f));

    try {
      // Pick a random key for the retry to distribute load simpler
      const key = apiKeys[Math.floor(Math.random() * apiKeys.length)];
      
      const metadataResults: Partial<Record<Platform, Metadata>> = {};

      for (const platform of selectedPlatforms) {
        const metadata = await generateMetadataForPlatform(key, item.file, item.previewFile, platform);
        metadataResults[platform] = metadata;
      }

      setFiles(current => current.map(f => 
        f.id === id 
        ? { ...f, status: 'complete', platformMetadata: { ...f.platformMetadata, ...metadataResults } } 
        : f
      ));

    } catch (error: any) {
      console.error(error);
      setFiles(current => current.map(f => f.id === id ? { ...f, status: 'error', error: error.message || "Failed to regenerate" } : f));
    }
  };

  // Metadata Generation
  const processBatch = async () => {
    if (apiKeys.length === 0) {
      setIsModalOpen(true);
      return;
    }

    setIsProcessing(true);
    let keyIndex = 0;

    // Process chunk by chunk to avoid browser freezing
    const concurrency = 6;
    const items = [...files];

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      
      await Promise.all(batch.map(async (item) => {
        if (item.status === 'complete') return;

        setFiles(current => current.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));

        try {
          const platforms = selectedPlatforms;
          const metadataResults: Partial<Record<Platform, Metadata>> = {};

          for (const platform of platforms) {
            // Rotate keys
            const key = apiKeys[keyIndex % apiKeys.length];
            keyIndex++;

            const metadata = await generateMetadataForPlatform(key, item.file, item.previewFile, platform);
            metadataResults[platform] = metadata;
          }

          setFiles(current => current.map(f => 
            f.id === item.id 
            ? { ...f, status: 'complete', platformMetadata: { ...f.platformMetadata, ...metadataResults } } 
            : f
          ));

        } catch (error) {
          console.error(error);
          setFiles(current => current.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
        }
      }));
    }
    setIsProcessing(false);
  };

  // Updating Metadata
  const updateMetadata = (id: string, platform: Platform, field: string, value: any) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id && f.platformMetadata[platform]) {
        return {
          ...f,
          platformMetadata: {
            ...f.platformMetadata,
            [platform]: { ...f.platformMetadata[platform]!, [field]: value }
          }
        };
      }
      return f;
    }));
  };

  // Bulk Apply
  const handleBulkApply = (ops: BulkOperations) => {
    // Save current state to history
    setHistory(prev => {
        // Keep last 10 states to avoid memory issues
        const newHistory = [...prev, files];
        if (newHistory.length > 10) return newHistory.slice(newHistory.length - 10);
        return newHistory;
    });

    setFiles(prev => prev.map(file => {
      const newMetadata = { ...file.platformMetadata };
      let modified = false;

      ops.platforms.forEach(p => {
        if (newMetadata[p]) {
          modified = true;
          const meta = newMetadata[p]!;
          
          // Title
          let title = meta.title;
          if (ops.findText) {
            title = title.split(ops.findText).join(ops.replaceText);
          }
          title = `${ops.prefix}${title}${ops.suffix}`;

          // Keywords
          let keywords = meta.keywords;
          if (ops.addKeywords) {
            const newKws = ops.addKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
            keywords = [...new Set([...keywords, ...newKws])];
          }

          newMetadata[p] = { ...meta, title, keywords };
        }
      });

      return modified ? { ...file, platformMetadata: newMetadata } : file;
    }));
  };

  // Undo last bulk edit
  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setFiles(previousState);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setFiles([]);
    setHistory([]);
  };

  // Platform Toggle
  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              <span className="text-adobe">MicroStock</span> Metadata
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={toggleTheme} 
               className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
               aria-label="Toggle Theme"
             >
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                )}
             </button>
             <button 
               onClick={() => setIsModalOpen(true)}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
             >
               <span>API Keys</span>
               <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{apiKeys.length}</span>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">1. Upload Files</h2>
              
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                   <svg className="w-8 h-8 mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                   <p className="text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Click to upload</span> (Unlimited)</p>
                </div>
                <input type="file" className="hidden" multiple accept=".jpg,.jpeg,.png,.ai,.eps,.mp4,.mov" onChange={handleFileUpload} />
              </label>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Target Platforms</h3>
                <div className="space-y-2">
                  {(Object.keys(PLATFORM_CONFIGS) as Platform[]).map(p => (
                     <label key={p} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedPlatforms.includes(p)} 
                          onChange={() => togglePlatform(p)}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{PLATFORM_CONFIGS[p].name}</span>
                     </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-3">
                 {isProcessing ? (
                   <div className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 shadow-inner">
                      <div className="flex justify-between items-center text-sm">
                         <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                           <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           Processing...
                         </span>
                         <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{processedCount}/{totalCount}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                         <div 
                           className="bg-adobe h-2.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(250,0,0,0.5)]" 
                           style={{ width: `${progressPercentage}%` }}
                         ></div>
                      </div>
                      <p className="text-xs text-center text-slate-400 dark:text-slate-500 animate-pulse">
                         Generating optimized metadata with AI...
                      </p>
                   </div>
                 ) : (
                   <button 
                      onClick={processBatch}
                      disabled={files.length === 0 || selectedPlatforms.length === 0}
                      className="w-full py-3 bg-adobe hover:bg-red-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-red-500/20"
                   >
                      Generate Metadata
                   </button>
                 )}
                 
                 <button 
                    onClick={handleClearAll}
                    disabled={files.length === 0 || isProcessing}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-bold transition-colors disabled:opacity-50"
                 >
                    Clear All
                 </button>
              </div>
           </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                 <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Results ({files.length})</h2>
                 
                 <div className="flex flex-wrap items-center gap-2">
                    <label className={`cursor-pointer px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                       Add New
                       <input type="file" multiple accept=".jpg,.jpeg,.png,.ai,.eps,.mp4,.mov" onChange={handleFileUpload} className="hidden" disabled={isProcessing} />
                    </label>

                    <button 
                       onClick={() => setIsBulkEditOpen(true)}
                       disabled={files.length === 0 || isProcessing}
                       className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1"
                    >
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                       Bulk Edit
                    </button>

                    <button 
                       onClick={handleUndo}
                       disabled={history.length === 0 || isProcessing}
                       className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                       title="Undo last bulk edit"
                    >
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                       Undo
                    </button>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                    {selectedPlatforms.includes('adobe') && (
                      <button onClick={() => downloadZip('adobe', PLATFORM_CONFIGS.adobe, files)} disabled={files.filter(f => f.status === 'complete').length === 0 || isProcessing} className="px-3 py-1.5 text-xs font-bold bg-adobe text-white rounded hover:opacity-90 disabled:opacity-50">
                        📦 Adobe ZIP
                      </button>
                    )}
                    {selectedPlatforms.includes('shutterstock') && (
                      <button onClick={() => downloadZip('shutterstock', PLATFORM_CONFIGS.shutterstock, files)} disabled={files.filter(f => f.status === 'complete').length === 0 || isProcessing} className="px-3 py-1.5 text-xs font-bold bg-shutterstock text-white rounded hover:opacity-90 disabled:opacity-50">
                        📦 Shutter ZIP
                      </button>
                    )}
                    {selectedPlatforms.includes('freepik') && (
                      <button onClick={() => downloadZip('freepik', PLATFORM_CONFIGS.freepik, files)} disabled={files.filter(f => f.status === 'complete').length === 0 || isProcessing} className="px-3 py-1.5 text-xs font-bold bg-freepik text-white rounded hover:opacity-90 disabled:opacity-50">
                        📦 Freepik ZIP
                      </button>
                    )}
                 </div>
              </div>

              <div className="space-y-4">
                 {files.length === 0 ? (
                   <div className="text-center py-12 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                      <p>Upload files to start generating metadata</p>
                   </div>
                 ) : (
                   files.map(file => (
                     <ResultItem 
                        key={file.id} 
                        item={file} 
                        selectedPlatforms={selectedPlatforms}
                        onUpdateMetadata={updateMetadata}
                        onUploadPreview={handlePreviewUpload}
                        onRegenerate={handleRegenerate}
                     />
                   ))
                 )}
              </div>
           </div>
        </div>

      </main>

      <ApiModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        apiKeys={apiKeys}
        onAddKey={addApiKey}
        onRemoveKey={removeApiKey}
        onClearKeys={clearApiKeys}
      />
      
      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedPlatforms={selectedPlatforms}
        onApply={handleBulkApply}
        totalFiles={files.length}
      />
    </div>
  );
};

export default App;