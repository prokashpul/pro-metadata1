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

  const Slider = ({ label, min, max, valMin, valMax, kMin, kMax }: { label: string, min: number, max: number, valMin: number, valMax: number, kMin: keyof GenerationSettings, kMax: keyof GenerationSettings }) => (
    <div className="space-y-3 mb-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
           <div className="flex justify-between text-xs text-slate-500 mb-1">
             <span>Min: {valMin}</span>
           </div>
           <input 
             type="range" 
             min={min} 
             max={valMax} // Ensure min doesn't exceed max
             value={valMin} 
             onChange={(e) => updateSetting(kMin, parseInt(e.target.value))}
             className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
           />
        </div>
        <div>
           <div className="flex justify-between text-xs text-slate-500 mb-1">
             <span>Max: {valMax}</span>
           </div>
           <input 
             type="range" 
             min={valMin} // Ensure max doesn't fall below min
             max={max} 
             value={valMax} 
             onChange={(e) => updateSetting(kMax, parseInt(e.target.value))}
             className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
           />
        </div>
      </div>
    </div>
  );

  const Toggle = ({ label, checked, settingKey, info }: { label: string, checked: boolean, settingKey: keyof GenerationSettings, info?: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {info && <span className="text-xs text-slate-500">{info}</span>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
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
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
           <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">Metadata Customization</span>
        </div>
        
        <Slider 
          label="Title Length (Words)" 
          min={1} max={50} 
          valMin={settings.minTitleWords} valMax={settings.maxTitleWords}
          kMin="minTitleWords" kMax="maxTitleWords"
        />

        <Slider 
          label="Keywords Count" 
          min={5} max={50} 
          valMin={settings.minKeywords} valMax={settings.maxKeywords}
          kMin="minKeywords" kMax="maxKeywords"
        />

        <Slider 
          label="Description Length (Words)" 
          min={5} max={100} 
          valMin={settings.minDescWords} valMax={settings.maxDescWords}
          kMin="minDescWords" kMax="maxDescWords"
        />
      </div>

      {/* Settings Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
         <div className="flex items-center gap-2 mb-4">
           <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">Settings</span>
         </div>

         <div className="space-y-1">
            <Toggle label="SILHOUETTE" checked={settings.enableSilhouette} settingKey="enableSilhouette" />
            
            <Toggle label="CUSTOM PROMPT" checked={settings.enableCustomPrompt} settingKey="enableCustomPrompt" />
            {settings.enableCustomPrompt && (
              <div className="mb-3">
                 <input 
                   type="text" 
                   value={settings.customPromptText}
                   onChange={(e) => updateSetting('customPromptText', e.target.value)}
                   placeholder="E.g. Focus on the texture..."
                   className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                 />
              </div>
            )}

            <Toggle label="White Background" checked={settings.enableWhiteBg} settingKey="enableWhiteBg" />
            <Toggle label="Transparent Background" checked={settings.enableTransparentBg} settingKey="enableTransparentBg" />
            
            <Toggle label="PROHIBITED WORDS" checked={settings.enableProhibitedWords} settingKey="enableProhibitedWords" />
             {settings.enableProhibitedWords && (
              <div className="mb-3">
                 <input 
                   type="text" 
                   value={settings.prohibitedWordsText}
                   onChange={(e) => updateSetting('prohibitedWordsText', e.target.value)}
                   placeholder="E.g. people, blur, text..."
                   className="w-full text-sm p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                 />
              </div>
            )}

            <Toggle label="SINGLE WORD KEYWORDS" checked={settings.enableSingleWordKeywords} settingKey="enableSingleWordKeywords" info="Force single words only (no phrases)" />
         </div>
      </div>

    </div>
  );
};

export default SettingsPanel;
