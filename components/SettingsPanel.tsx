import React from 'react';
import { GenerationSettings } from '../types';

interface SettingsPanelProps {
  settings: GenerationSettings;
  onChange: (newSettings: GenerationSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
  const updateSetting = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const SingleSlider = ({ 
    label, 
    val, 
    min, 
    max, 
    onChange, 
    info 
  }: { 
    label: string, 
    val: number, 
    min: number, 
    max: number, 
    onChange: (v: number) => void, 
    info?: string 
  }) => (
     <div className="mb-4 last:mb-0">
        <div className="flex justify-between items-center mb-2">
           <div className="flex items-center gap-1.5">
             <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{label}</label>
             {info && (
               <div className="group relative flex items-center">
                  <svg className="w-3.5 h-3.5 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-20 pointer-events-none">
                    {info}
                    <div className="absolute top-full left-1 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                  </div>
               </div>
             )}
           </div>
           <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-bold font-mono min-w-[2.5rem] text-center shadow-sm">
             {val}
           </span>
        </div>
        <div className="relative h-4 flex items-center">
          <input 
            type="range" 
            min={min} 
            max={max} 
            value={val} 
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="absolute w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600 hover:accent-indigo-500 transition-all z-10"
          />
        </div>
     </div>
  );

  const Toggle = ({ label, checked, settingKey, info }: { label: string, checked: boolean, settingKey: keyof GenerationSettings, info?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <div className="flex flex-col pr-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
          {info && (
             <div className="group relative flex items-center">
                <svg className="w-3.5 h-3.5 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="absolute right-0 top-full mt-1 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-20 pointer-events-none">
                  {info}
                </div>
             </div>
          )}
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={(e) => updateSetting(settingKey, e.target.checked)} 
          className="sr-only peer" 
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Metadata Customization Section */}
      <div className="bg-white dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-700/50">
           <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md shadow-orange-500/20">Metadata Customization</span>
        </div>
        
        <div className="space-y-2">
          <SingleSlider 
            label="Min Title Words" 
            min={1} max={settings.maxTitleWords} // constraint
            val={settings.minTitleWords} 
            onChange={(v) => updateSetting('minTitleWords', v)}
            info="Minimum number of words the AI will target for titles."
          />
          <SingleSlider 
            label="Max Title Words" 
            min={settings.minTitleWords} max={50} // constraint
            val={settings.maxTitleWords} 
            onChange={(v) => updateSetting('maxTitleWords', v)}
            info="Maximum number of words for titles. Note: Platform character limits still apply."
          />
          
          <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-4"></div>

          <SingleSlider 
            label="Min Keywords" 
            min={5} max={settings.maxKeywords} 
            val={settings.minKeywords} 
            onChange={(v) => updateSetting('minKeywords', v)}
          />
          <SingleSlider 
            label="Max Keywords" 
            min={settings.minKeywords} max={50} 
            val={settings.maxKeywords} 
            onChange={(v) => updateSetting('maxKeywords', v)}
          />

          <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-4"></div>

          <SingleSlider 
            label="Min Desc Words" 
            min={5} max={settings.maxDescWords} 
            val={settings.minDescWords} 
            onChange={(v) => updateSetting('minDescWords', v)}
          />
          <SingleSlider 
            label="Max Desc Words" 
            min={settings.minDescWords} max={100} 
            val={settings.maxDescWords} 
            onChange={(v) => updateSetting('maxDescWords', v)}
          />
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
         <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/50">
           <span className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md shadow-indigo-500/20">Settings</span>
         </div>

         <div className="space-y-0.5">
            <Toggle label="SILHOUETTE" checked={settings.enableSilhouette} settingKey="enableSilhouette" info="Adds 'Subject is a silhouette' to system prompt." />
            
            <Toggle label="White Background" checked={settings.enableWhiteBg} settingKey="enableWhiteBg" info="Instructs AI that image has an isolated white background." />
            <Toggle label="Transparent Background" checked={settings.enableTransparentBg} settingKey="enableTransparentBg" info="Instructs AI that image has a transparent background." />
            
            <Toggle label="SINGLE WORD KEYWORDS" checked={settings.enableSingleWordKeywords} settingKey="enableSingleWordKeywords" info="Force strict single words only (no phrases). Good for some agencies." />

            <div className="pt-2">
              <Toggle label="CUSTOM PROMPT" checked={settings.enableCustomPrompt} settingKey="enableCustomPrompt" info="Add your own custom instruction to the AI." />
              {settings.enableCustomPrompt && (
                <div className="mt-2 mb-2 px-1">
                   <textarea 
                     value={settings.customPromptText}
                     onChange={(e) => updateSetting('customPromptText', e.target.value)}
                     placeholder="E.g. Focus on the texture and lighting details..."
                     rows={2}
                     className="w-full text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                   />
                </div>
              )}
            </div>

            <div className="pt-2">
              <Toggle label="PROHIBITED WORDS" checked={settings.enableProhibitedWords} settingKey="enableProhibitedWords" info="Prevent specific words from appearing in metadata." />
               {settings.enableProhibitedWords && (
                <div className="mt-2 mb-2 px-1">
                   <textarea 
                     value={settings.prohibitedWordsText}
                     onChange={(e) => updateSetting('prohibitedWordsText', e.target.value)}
                     placeholder="E.g. people, blur, text, vector..."
                     rows={2}
                     className="w-full text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                   />
                </div>
              )}
            </div>
         </div>
      </div>

    </div>
  );
};

export default SettingsPanel;