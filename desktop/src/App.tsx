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

interface GuideInfo { id: number; software_name: string; display_name: string; version: string; platform: string; markdown_content: string; cached: boolean; }

interface InstallState { running: boolean; output: string; status: 'idle' | 'running' | 'success' | 'error'; }

const PLATFORM_OPTIONS = ['windows','macos','linux'].map(p=>({value:p,label:p}));

export default function App() {
  const [appState, setAppState] = useState<AppState>('home');
  const [softwareInfo, setSoftwareInfo] = useState<SoftwareInfo|null>(null);
  const [guideInfo, setGuideInfo] = useState<GuideInfo|null>(null);
  const [installState, setInstallState] = useState<InstallState>({running:false,output:'',status:'idle'});
  const [error, setError] = useState('');
  const [presets, setPresets] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(()=>{api.health().catch(()=>{});api.getPresets().then(p=>setPresets(p.software)).catch(()=>{});},[]);

  const handleSearch = useCallback(async (query:string) => {
    if(!query.trim())return;setError('');setAppState('loading');
    try{const r=await api.searchSoftware(query);const sv=r.versions.filter((v:any)=>v.is_stable);const dv=sv.length>0?sv[0]:r.versions[0];setSoftwareInfo({...r,selected_version:dv?.version||'latest',selected_platform:r.platform});setAppState('version_select');}catch(e:any){setError(e.message);setAppState('home');}
  },[]);

  const handleGenerateGuide = useCallback(async()=>{if(!softwareInfo)return;setError('');setAppState('generating');try{const g=await api.generateGuide(softwareInfo.software_name,softwareInfo.selected_version||'latest',softwareInfo.selected_platform||softwareInfo.platform);setGuideInfo(g);setAppState('guide');}catch(e:any){setError(e.message);setAppState('version_select');}},[softwareInfo]);

  const handleOneClickInstall = useCallback(async()=>{if(!guideInfo||!softwareInfo)return;const p=softwareInfo.selected_platform||softwareInfo.platform;setInstallState({running:true,output:'',status:'running'});setAppState('installing');try{const sr=await api.getInstallScript(guideInfo.software_name,guideInfo.version,p);if(window.electronAPI){window.electronAPI.onScriptOutput(d=>setInstallState(prev=>({...prev,output:prev.output+`[${d.type}]${d.data}`})));const r=await window.electronAPI.executeScript({script:sr.script,platform:p});window.electronAPI.removeScriptOutputListener();setInstallState({running:false,output:r.success?r.output+'\nDone!':r.output+'\n'+r.errorOutput,status:r.success?'success':'error'});}else{setInstallState({running:false,output:'Browser mode\n'+sr.script,status:'error'});}}catch(e:any){setInstallState({running:false,output:'Error:'+e.message,status:'error'});}},[guideInfo,softwareInfo]);

  const handleFeedback=useCallback(async(h:boolean,c:string)=>{if(!guideInfo||!softwareInfo)return;try{await api.submitFeedback({guide_id:guideInfo.id,software_name:softwareInfo.software_name,version:softwareInfo.selected_version||'latest',platform:softwareInfo.selected_platform||softwareInfo.platform,is_helpful:h,comment:c});setShowFeedback(false);}catch(e:any){setError(e.message);}},[guideInfo,softwareInfo]);

  const reset=()=>{setAppState('home');setSoftwareInfo(null);setGuideInfo(null);setInstallState({running:false,output:'',status:'idle'});setError('');};

  return (<div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50"><header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50"><div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between"><h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fun-pink to-fun-orange">zhuang le ma?</h1>{appState!=='home'&&<button onClick={reset} className="btn-secondary text-sm">Home</button>}</div></header><main className="max-w-5xl mx-auto px-6 py-8">{error&&<div className="mb-6 p-4 bg-red-50 rounded-xl"><p className="text-red-700">{error}</p><button onClick={()=>setError('')}>x</button></div>}{appState==='home'&&<div className="space-y-8 slide-up"><div className="text-center py-8"><h2 className="text-3xl font-bold">Install anything</h2></div><SearchBox onSearch={handleSearch} presets={presets}/></div>}{appState==='loading'&&<div className="flex justify-center py-20"><div className="w-16 h-16 border-4 border-fun-orange/20 border-t-fun-orange rounded-full animate-spin"/></div>}{appState==='version_select'&&softwareInfo&&<VersionSelector softwareInfo={softwareInfo} platformOptions={PLATFORM_OPTIONS} onVersionChange={v=>setSoftwareInfo({...softwareInfo,selected_version:v})} onPlatformChange={p=>setSoftwareInfo({...softwareInfo,selected_platform:p})} onGenerate={handleGenerateGuide} onBack={reset}/>}{appState==='generating'&&<div className="flex justify-center py-20"><p>Generating...</p></div>}{appState==='guide'&&guideInfo&&softwareInfo&&<div className="space-y-6 slide-up"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{guideInfo.display_name} {guideInfo.version}</h2><div className="flex gap-2"><button onClick={()=>setAppState('version_select')} className="btn-secondary text-sm">Change</button><button onClick={handleOneClickInstall} className="btn-primary text-sm">Install</button></div></div><div className="card"><MarkdownGuide content={guideInfo.markdown_content}/></div><div className="card">{!showFeedback?<div className="flex justify-between"><p>Helpful?</p><div className="flex gap-2"><button onClick={()=>handleFeedback(true,'')} className="px-4 py-2 bg-green-50 text-green-600 rounded-lg">Yes</button><button onClick={()=>setShowFeedback(true)} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg">No</button></div></div>:<FeedbackForm onSubmit={c=>handleFeedback(false,c)} onCancel={()=>setShowFeedback(false)}/>}</div></div>}{appState==='installing'&&<InstallExecutor installState={installState} onBack={()=>setAppState('guide')} onDone={reset}/>}</main><footer className="text-center py-6 text-gray-400 text-sm">zhuang le ma? v1.0</footer></div>);
}
