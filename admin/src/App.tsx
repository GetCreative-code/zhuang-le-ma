import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from './lib/api';

type TabType = 'guides' | 'feedback' | 'stats';

interface Guide {
  id: number;
  software_name: string;
  display_name: string;
  version: string;
  platform: string;
  created_at: string;
  markdown_preview: string;
}

interface GuideDetail {
  id: number;
  software_name: string;
  display_name: string;
  version: string;
  platform: string;
  markdown_content: string;
  created_at: string;
  updated_at: string;
}

interface Feedback {
  id: number;
  guide_id: number | null;
  software_name: string;
  version: string;
  platform: string;
  is_helpful: boolean | null;
  comment: string | null;
  created_at: string;
  processed: boolean;
}

interface Stats {
  total_guides: number;
  total_feedback: number;
  helpful_count: number;
  unhelpful_count: number;
  top_software: Array<{ name: string; count: number }>;
  selection_stats: Array<{ software_name: string; version: string; platform: string; count: number }>;
}

export default function AdminApp() {
  const [token, setToken] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('guides');
  const [guides, setGuides] = useState<Guide[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingGuide, setEditingGuide] = useState<GuideDetail | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editError, setEditError] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const result = await adminApi.login(password);
      setToken(result.token);
      localStorage.setItem('admin_token', result.token);
    } catch (e: any) {
      setLoginError(e.message);
    }
    setLoading(false);
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('admin_token');
  };

  const loadGuides = useCallback(async () => {
    if (!token) return;
    try { const data = await adminApi.getGuides(token); setGuides(data); } catch {}
  }, [token]);

  const loadFeedback = useCallback(async () => {
    if (!token) return;
    try { const data = await adminApi.getFeedback(token); setFeedbacks(data); } catch {}
  }, [token]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try { const data = await adminApi.getStats(token); setStats(data); } catch {}
  }, [token]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'guides') loadGuides();
    if (activeTab === 'feedback') loadFeedback();
    if (activeTab === 'stats') loadStats();
  }, [token, activeTab, loadGuides, loadFeedback, loadStats]);

  const openEditor = async (guide: Guide) => {
    try {
      const detail = await adminApi.getGuideDetail(guide.id, token);
      setEditingGuide(detail);
      setEditContent(detail.markdown_content);
      setEditError('');
    } catch (e: any) { setEditError(e.message); }
  };

  const saveGuide = async () => {
    if (!editingGuide) return;
    setLoading(true);
    try {
      await adminApi.updateGuide(editingGuide.id, token, { markdown_content: editContent });
      setEditingGuide(null);
      loadGuides();
    } catch (e: any) { setEditError(e.message); }
    setLoading(false);
  };

  const deleteGuide = async (guideId: number) => {
    if (!confirm('确定要删除这个方案吗？')) return;
    try { await adminApi.deleteGuide(guideId, token); loadGuides(); } catch (e: any) { alert(e.message); }
  };

  const regenerateGuide = async (guideId: number) => {
    setRegenerating(true);
    try {
      const result = await adminApi.regenerateGuide(guideId, token);
      setEditingGuide((prev) => prev ? { ...prev, markdown_content: result.markdown_content } : null);
      setEditContent(result.markdown_content);
      loadGuides();
    } catch (e: any) { alert(e.message); }
    setRegenerating(false);
  };

  const processFeedback = async (feedbackId: number) => {
    try { await adminApi.processFeedback(feedbackId, token); loadFeedback(); } catch (e: any) { alert(e.message); }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-pink-50 to-yellow-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mt-2">装了吗 · 管理后台</h1>
            <p className="text-gray-500 text-sm mt-1">请输入管理员密码</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-fun-orange focus:outline-none text-lg text-center" autoFocus />
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
            <button type="submit" disabled={loading || !password}
              className="w-full py-3 bg-gradient-to-r from-fun-pink to-fun-orange text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">装了吗 · 管理后台</h1>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-600">退出登录</button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6">
          {[{key:'guides',label:'方案管理',count:guides.length},{key:'feedback',label:'用户反馈',count:feedbacks.length},{key:'stats',label:'数据统计'}].map(tab=>(<button key={tab.key} onClick={()=>setActiveTab(tab.key as TabType)} className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab===tab.key?'bg-gradient-to-r from-fun-pink to-fun-orange text-white':'text-gray-600 hover:bg-gray-100'}`}>{tab.label}{tab.count!==undefined&&<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${activeTab===tab.key?'bg-white/30':'bg-gray-200'}`}>{tab.count}</span>}</button>))}
        </div>
        {activeTab==='guides'&&<div className="space-y-3">{guides.length===0?<div className="text-center py-20 text-gray-400"><p>暂无方案</p></div>:guides.map(g=>(<div key={g.id} className="bg-white rounded-xl p-5 shadow-sm"><div className="flex items-start justify-between"><div><h3 className="font-semibold">{g.display_name}</h3><span className="badge bg-blue-100 text-xs">{g.version}</span><span className="badge bg-purple-100 text-xs">{g.platform}</span><p className="text-sm text-gray-500 truncate">{g.markdown_preview}</p></div><div className="flex gap-2"><button onClick={()=>openEditor(g)} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg">编辑</button><button onClick={()=>regenerateGuide(g.id)} disabled={regenerating} className="px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg">重新生成</button><button onClick={()=>deleteGuide(g.id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-500 rounded-lg">删除</button></div></div></div>))}</div>}
        {activeTab==='feedback'&&<div className="space-y-3">{feedbacks.length===0?<div className="text-center py-20 text-gray-400"><p>暂无反馈</p></div>:feedbacks.map(fb=>(<div key={fb.id} className={`bg-white rounded-xl p-5 shadow-sm ${fb.processed?'opacity-60':''}`}><div><span className="font-semibold">{fb.software_name}</span><span className="badge bg-blue-100 text-xs">{fb.version}</span>{fb.comment&&<p className="text-sm bg-gray-50 rounded-lg p-3">{fb.comment}</p>}{!fb.processed&&<button onClick={()=>processFeedback(fb.id)} className="px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg">标记已处理</button>}</div></div>))}</div>}
        {activeTab==='stats'&&stats&&<div className="space-y-6"><div className="grid grid-cols-4 gap-4">{[{label:'总方案',value:stats.total_guides},{label:'总反馈',value:stats.total_feedback},{label:'有用',value:stats.helpful_count},{label:'没用',value:stats.unhelpful_count}].map(c=>(<div key={c.label} className="bg-blue-50 rounded-xl p-5"><div className="text-3xl font-bold">{c.value}</div><div className="text-sm">{c.label}</div></div>))}</div><div className="bg-white rounded-xl p-6"><h3>热门软件</h3>{stats.top_software.map((sw,i)=>(<div key={sw.name} className="flex items-center gap-3"><span>{i+1}</span><span>{sw.name}</span><div className="flex-1 bg-gray-100 rounded-full h-3"><div className="h-full bg-gradient-to-r from-fun-pink to-fun-orange rounded-full" style={{width:`${(sw.count/stats.top_software[0].count)*100}%`}}/></div><span>{sw.count}次</span></div>))}</div></div>}
      </div>
    </div>
  );
}
