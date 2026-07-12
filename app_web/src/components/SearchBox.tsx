import React, { useState } from 'react';

interface SearchBoxProps { onSearch: (query: string) => void; presets: string[]; }

export default function SearchBox({ onSearch, presets }: SearchBoxProps) {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) onSearch(query.trim()); }} className="flex gap-3">
        <div className="relative flex-1">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "install MySQL" or type a software name...'
            className="input-field pl-4 pr-4 py-4 text-lg" autoFocus />
        </div>
        <button type="submit" className="btn-primary text-lg px-8" disabled={!query.trim()}>Search</button>
      </form>
      {presets.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {presets.map((name) => (
          <button key={name} onClick={() => onSearch(name)}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-100 hover:scale-105 transition-all">
            <span className="text-xs font-medium text-gray-600">{name}</span>
          </button>
        ))}
      </div>}
    </div>
  );
}
