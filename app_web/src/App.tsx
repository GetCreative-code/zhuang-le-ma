import React, { useState, useEffect, useCallback } from 'react';
import { api } from './lib/api';
import SearchBox from './components/SearchBox';
import VersionSelector from './components/VersionSelector';
import MarkdownGuide from './components/MarkdownGuide';
import InstallExecutor from './components/InstallExecutor';
import FeedbackForm from './components/FeedbackForm';

type AppState = 'home' | 'loading' | 'version_select' | 'generating' | 'guide' | 'installing';

interface SoftwareInfo {
  software_name: string;
  display_name: string;
  versions: Array<{ version: string; is_stable: boolean; platform: string; source?: string }>;
  platform: string;
  selected_version?: string;
  selected_platform?: string;
}

interface GuideInfo {
  id: number;
  software_name: string;
  display_name: string;
  version: string;
  platform: string;
  markdown_content: string;
  cached: boolean;
}

interface InstallState {
  running: boolean;
  output: string;
  status: 'idle' | 'running' | 'success' | 'error';
}

const PLATFORM_OPTIONS = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
];

export default function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [softwareInfo, setSoftwareInfo] = useState<SoftwareInfo | null>(null);
  const [guideInfo, setGuideInfo] = useState<GuideInfo | null>(null);
  const [installState, setInstallState] = useState<InstallState>({ running: false, output: '', status: 'idle' });
  const [error, setError] = useState<string>('');
  const [aiConfigured, setAiConfigured] = useState(true);
  const [presets, setPresets] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { checkHealth(); loadPresets(); }, []);

  const checkHealth = async () => {
    try { const h = await api.health(); setAiConfigured(h.ai_configured); }
    catch { setError('Cannot connect to server. Run: python server/main.py'); }
  };

  const loadPresets = async () => {
    try { const p = await api.getPresets(); setPresets(p.software); } catch {}
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setError('');
    setAppState('loading');
    try {
      const result = await api.searchSoftware(query);
      const stableVersions = result.versions.filter((v: any) => v.is_stable);
      const defaultVersion = stableVersions.length > 0 ? stableVersions[0] : result.versions[0];
      setSoftwareInfo({ ...result, selected_version: defaultVersion?.version || 'latest', selected_platform: result.platform });
      setAppState('version_select');
    } catch (e: any) { setError(e.message); setAppState('home'); }
  }, []);

  const handleGenerateGuide = useCallback(async () => {
    if (!softwareInfo) return;
    setError('');
    setAppState('generating');
    try {
      const guide = await api.generateGuide(softwareInfo.software_name, softwareInfo.selected_version || 'latest', softwareInfo.selected_platform || softwareInfo.platform);
      setGuideInfo(guide);
      setAppState('guide');
    } catch (e: any) { setError(e.message); setAppState('version_select'); }
  }, [softwareInfo]);

  const handleOneClickInstall = useCallback(async () => {
    if (!guideInfo || !softwareInfo) return;
    const platform = softwareInfo.selected_platform || softwareInfo.platform;
    setInstallState({ running: true, output: '', status: 'running' });
    setAppState('installing');
    try {
      const scriptResult = await api.getInstallScript(guideInfo.software_name, guideInfo.version, platform);
      const script = scriptResult.script;
      if (window.electronAPI) {
        window.electronAPI.onScriptOutput((data) => { setInstallState((prev) => ({ ...prev, output: prev.output + `[${data.type}] ${data.data}` })); });
        const result = await window.electronAPI.executeScript({ script, platform });
        window.electronAPI.removeScriptOutputListener();
        setInstallState({ running: false, output: result.success ? `${result.output}\nDone!` : `${result.output}\n${result.errorOutput}\nError`, status: result.success ? 'success' : 'error' });
      } else {
        setInstallState({ running: false, output: `Browser mode - copy script manually:\n${script}`, status: 'error' });
      }
    } catch (e: any) { setInstallState({ running: false, output: `Error: ${e.message}`, status: 'error' }); }
  }, [guideInfo, softwareInfo]);

  const handleFeedback = useCallback(async (isHelpful: boolean, comment: string) => {
    if (!guideInfo || !softwareInfo) return;
    try {
      await api.submitFeedback({ guide_id: guideInfo.id, software_name: softwareInfo.software_name, version: softwareInfo.selected_version || 'latest', platform: softwareInfo.selected_platform || softwareInfo.platform, is_helpful: isHelpful, comment });
      setShowFeedback(false);
    } catch (e: any) { setError(e.message); }
  }, [guideInfo, softwareInfo]);

  const handleBackToHome = () => { setAppState('home'); setSoftwareInfo(null); setGuideInfo(null); setInstallState({ running: false, output: '', status: 'idle' }); setError(''); };
  const handleBackToVersionSelect = () => { setAppState('version_select'); setGuideInfo(null); setError(''); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-fun-pink to-fun-orange bg-clip-text text-transparent">zhuang le ma?</h1></div>
          {appState !== 'home' && <button onClick={handleBackToHome} className="btn-secondary text-sm">Home</button>}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"><p>{error}</p><button onClick={() => setError('')} className="ml-auto">x</button></div>}
        {appState === 'home' && <div className="space-y-8 slide-up"><div className="text-center py-8"><h2 className="text-3xl font-bold text-gray-800 mb-2">Install anything</h2><p className="text-gray-500">Type what you want to install</p></div><SearchBox onSearch={handleSearch} presets={presets} /></div>}
        {appState === 'loading' && <div className="flex flex-col items-center justify-center py-20"><div className="w-16 h-16 border-4 border-fun-orange/20 border-t-fun-orange rounded-full animate-spin mb-4"/><p>Analyzing...</p></div>}
        {appState === 'version_select' && softwareInfo && <VersionSelector softwareInfo={softwareInfo} platformOptions={PLATFORM_OPTIONS} onVersionChange={(v) => setSoftwareInfo({...softwareInfo,selected_version:v})} onPlatformChange={(p) => setSoftwareInfo({...softwareInfo,selected_platform:p})} onGenerate={handleGenerateGuide} onBack={handleBackToHome} />}
        {appState === 'generating' && <div className="flex flex-col items-center justify-center py-20"><div className="w-20 h-20 relative mb-6"><div className="absolute inset-0 bg-gradient-to-r from-fun-pink to-fun-orange rounded-full animate-pulse"/><div className="absolute inset-2 bg-white rounded-full flex items-center justify-center"><span className="text-3xl animate-bounce">AI</span></div></div><p>Generating install guide...</p></div>}
        {appState === 'guide' && guideInfo && softwareInfo && <div className="space-y-6 slide-up"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{guideInfo.display_name} {guideInfo.version}</h2><span className="badge">{guideInfo.version}</span></div><div className="flex gap-2"><button onClick={handleBackToVersionSelect} className="btn-secondary text-sm">Change</button><button onClick={handleOneClickInstall} className="btn-primary text-sm">Install</button></div></div><div className="card"><MarkdownGuide content={guideInfo.markdown_content} /></div><div className="card">{!showFeedback ? <div className="flex items-center justify-between"><p>Was this helpful?</p><div className="flex gap-2"><button onClick={() => handleFeedback(true, '')} className="px-4 py-2 bg-green-50 text-green-600 rounded-lg">Yes</button><button onClick={() => setShowFeedback(true)} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg">No</button></div></div> : <FeedbackForm onSubmit={(comment) => handleFeedback(false, comment)} onCancel={() => setShowFeedback(false)} />}</div></div>}
        {appState === 'installing' && <InstallExecutor installState={installState} onBack={() => setAppState('guide')} onDone={handleBackToHome} />}
      </main>
      <footer className="text-center py-6 text-gray-400 text-sm"><p>zhuang le ma? v1.0</p></footer>
    </div>
  );
}
