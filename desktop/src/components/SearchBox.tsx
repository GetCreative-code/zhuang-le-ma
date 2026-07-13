import React, { useState } from 'react';

export default function SearchBox({ onSearch, presets }: { onSearch: (q: string) => void; presets: string[] }) {
  const [query, setQuery] = useState('');
  return (
    <div className="space-y-6">
      <form onSubmit={e => { e.preventDefault(); if (query.trim()) onSearch(query.trim()); }} className="flex gap-3">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder='Type a software name...' className="input-field py-4 text-lg flex-1" autoFocus />
        <button type="submit" className="btn-primary text-lg px-8" disabled={!query.trim()}>Search</button>
      </form>
      {presets.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {presets.map(name => <button key={name} onClick={() => onSearch(name)} className="p-4 bg-white rounded-xl border-2 border-gray-100 hover:scale-105 transition-all text-sm font-medium text-gray-600">{name}</button>)}
      </div>}
    </div>
  );
}
