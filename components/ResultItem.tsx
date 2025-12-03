import React, { useState } from 'react';
import { ProcessedFile, Platform, PlatformConfig } from '../types';
import { PLATFORM_CONFIGS } from '../constants';

interface ResultItemProps {
  item: ProcessedFile;
  selectedPlatforms: Platform[];
  onUpdateMetadata: (id: string, platform: Platform, field: 'title'|'description'|'keywords', value: any) => void;
  onUploadPreview: (id: string, file: File) => void;
}

const ResultItem: React.FC<ResultItemProps> = ({ item, selectedPlatforms, onUpdateMetadata, onUploadPreview }) => {
  const [expanded, setExpanded] = useState(item.status === 'complete' || item.status === 'error');
  const [activeTab, setActiveTab] = useState<Platform>(item.activePlatform);

  const config: PlatformConfig = PLATFORM_CONFIGS[activeTab];
  const metadata = item.platformMetadata[activeTab];
  
  // Status Logic
  let statusColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  let statusText = "Pending";
  if (item.status === 'processing') {
    statusColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    statusText = "Processing...";
  } else if (item.status === 'complete') {
    statusColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    statusText = "Complete";
  } else if (item.status === 'error') {
    statusColor = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    statusText = "Error";
  }

  // Helper to handle preview upload
  const handlePreviewUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadPreview(item.id, e.target.files[0]);
    }
  };

  // Helper for clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isVector = item.file.name.match(/\.(ai|eps)$/i);

  // Validation Logic
  const getValidationState = () => {
    if (!metadata) return { title: true, desc: true, keywords: true };
    
    return {
        title: metadata.title.length >= config.titleMin && metadata.title.length <= config.titleMax,
        desc: metadata.description.length <= config.descMax,
        keywords: metadata.keywords.length >= config.keywordsMin && metadata.keywords.length <= config.keywordsMax
    };
  };

  const validation = getValidationState();

  const getInputStyle = (isValid: boolean) => 
    `w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-3 py-2 text-sm outline-none text-slate-800 dark:text-slate-200 pr-10 resize-none transition-colors ${
        isValid 
        ? 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500' 
        : 'border-red-500 dark:border-red-500 focus:ring-2 focus:ring-red-500'
    }`;

  return (
    <div className={`rounded-xl border transition-all duration-300 ${expanded ? 'border-slate-300 dark:border-slate-600 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
      
      {/* Header */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
           {/* Object-cover ensures it fills the 4rem square nicely even if resized */}
           <img src={item.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.file.name}</h3>
          <div className="flex items-center gap-2 mt-1">
             <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusText}</span>
             {isVector && !item.previewFile && (
               <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">No Preview</span>
             )}
             {metadata && (!validation.title || !validation.desc || !validation.keywords) && (
                 <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Issues Found
                 </span>
             )}
          </div>
        </div>

        <button className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
           <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700">
            
            {/* Vector Preview Uploader */}
            {isVector && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                        {item.previewFile ? `Preview: ${item.previewFile.name}` : "Upload JPG preview"}
                    </span>
                    <label className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1.5 rounded cursor-pointer transition-colors">
                        Choose File
                        <input type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handlePreviewUpload} />
                    </label>
                </div>
            )}

            {/* Platform Tabs */}
            {selectedPlatforms.length > 1 && (
                <div className="flex gap-2 mt-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                    {selectedPlatforms.map(p => (
                        <button
                            key={p}
                            onClick={(e) => { e.stopPropagation(); setActiveTab(p); }}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === p 
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        >
                            {PLATFORM_CONFIGS[p].name}
                        </button>
                    ))}
                </div>
            )}

            {/* Metadata Editors */}
            <div className="mt-4 space-y-4">
                {metadata ? (
                    <>
                        {/* Title */}
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Title</label>
                                <span className={`text-xs ${validation.title ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400 font-bold'}`}>
                                    {metadata.title.length} / {config.titleMax} chars (Min: {config.titleMin})
                                </span>
                            </div>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className={getInputStyle(validation.title)}
                                    value={metadata.title}
                                    onChange={(e) => onUpdateMetadata(item.id, activeTab, 'title', e.target.value)}
                                />
                                <button onClick={() => copyToClipboard(metadata.title)} className="absolute right-2 top-2 text-slate-400 hover:text-indigo-500" title="Copy">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"></path></svg>
                                </button>
                            </div>
                            {!validation.title && (
                                <p className="text-xs text-red-500 mt-1">Title must be between {config.titleMin} and {config.titleMax} characters.</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                                <span className={`text-xs ${validation.desc ? 'text-slate-400' : 'text-red-500 font-bold'}`}>
                                    {metadata.description.length} / {config.descMax}
                                </span>
                            </div>
                            <div className="relative">
                                <textarea 
                                    className={getInputStyle(validation.desc)}
                                    rows={2}
                                    value={metadata.description}
                                    onChange={(e) => onUpdateMetadata(item.id, activeTab, 'description', e.target.value)}
                                />
                                <button onClick={() => copyToClipboard(metadata.description)} className="absolute right-2 top-2 text-slate-400 hover:text-indigo-500" title="Copy">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"></path></svg>
                                </button>
                            </div>
                            {!validation.desc && (
                                <p className="text-xs text-red-500 mt-1">Description cannot exceed {config.descMax} characters.</p>
                            )}
                        </div>

                        {/* Keywords */}
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Keywords</label>
                                <span className={`text-xs ${validation.keywords ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400 font-bold'}`}>
                                    {metadata.keywords.length} / {config.keywordsMax} (Min: {config.keywordsMin})
                                </span>
                            </div>
                            <div className="relative">
                                <textarea 
                                    className={getInputStyle(validation.keywords)}
                                    rows={3}
                                    value={metadata.keywords.join(', ')}
                                    onChange={(e) => {
                                        const kws = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                                        onUpdateMetadata(item.id, activeTab, 'keywords', kws);
                                    }}
                                />
                                <button onClick={() => copyToClipboard(metadata.keywords.join(', '))} className="absolute right-2 top-2 text-slate-400 hover:text-indigo-500" title="Copy">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"></path></svg>
                                </button>
                            </div>
                            {!validation.keywords && (
                                <p className="text-xs text-red-500 mt-1">Requires between {config.keywordsMin} and {config.keywordsMax} keywords.</p>
                            )}
                            
                            {metadata.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {metadata.keywords.slice(0, 10).map((k, i) => (
                                        <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{k}</span>
                                    ))}
                                    {metadata.keywords.length > 10 && <span className="text-xs text-slate-400 px-1">+{metadata.keywords.length - 10} more</span>}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="p-4 text-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        {item.status === 'processing' ? 'Generating metadata...' : 'Waiting to process...'}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultItem;