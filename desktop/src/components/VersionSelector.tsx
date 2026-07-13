import React from 'react';

export default function VersionSelector({ softwareInfo, platformOptions, onVersionChange, onPlatformChange, onGenerate, onBack }: {
  softwareInfo: { display_name: string; versions: Array<{version:string;is_stable:boolean}>; selected_version?: string; selected_platform?: string };
  platformOptions: Array<{value:string;label:string}>;
  onVersionChange: (v: string) => void;
  onPlatformChange: (p: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}) {
  const { display_name, versions, selected_version, selected_platform } = softwareInfo;
  const stableVersions = versions.filter(v => v.is_stable);

  return (
    <div className="space-y-6 slide-up max-w-2xl mx-auto">
      <div className="text-center"><h2 className="text-2xl font-bold text-gray-800">{display_name}</h2></div>
      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Platform</h3>
        <div className="flex gap-2">
          {platformOptions.map(opt => (
            <button key={opt.value} onClick={() => onPlatformChange(opt.value)}
              className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium ${selected_platform===opt.value?'border-fun-orange bg-orange-50 text-fun-orange':'border-gray-200 text-gray-600'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Version</h3>
        {stableVersions.map(v => (
          <button key={v.version} onClick={() => onVersionChange(v.version)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 mb-2 ${selected_version===v.version?'border-green-500 bg-green-50':'border-gray-100'}`}>
            <span className="font-mono font-bold">{v.version}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">Back</button>
        <button onClick={onGenerate} className="btn-primary flex-1" disabled={!selected_version}>Generate</button>
      </div>
    </div>
  );
}
