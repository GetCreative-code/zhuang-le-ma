const API_BASE = 'http://localhost:8000';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  searchSoftware: (query: string, platform: string = 'auto') =>
    request('/api/software/search', { method: 'POST', body: JSON.stringify({ query, platform }) }),

  generateGuide: (softwareName: string, version: string, platform: string) =>
    request(`/api/software/${softwareName}/guide`, { method: 'POST', body: JSON.stringify({ software_name: softwareName, version, platform }) }),

  getInstallScript: (softwareName: string, version: string, platform: string) =>
    request(`/api/software/${softwareName}/install-script`, { method: 'POST', body: JSON.stringify({ software_name: softwareName, version, platform }) }),

  submitFeedback: (data: any) => request('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getPresets: () => request('/api/presets'),
  health: () => request('/api/health'),
};
