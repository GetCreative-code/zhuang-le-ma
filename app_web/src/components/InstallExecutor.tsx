import React from 'react';

interface InstallExecutorProps {
  installState: { running: boolean; output: string; status: string };
  onBack: () => void; onDone: () => void;
}

export default function InstallExecutor({ installState, onBack, onDone }: InstallExecutorProps) {
  const { running, output, status } = installState;
  return (
    <div className="space-y-6 slide-up max-w-3xl mx-auto">
      <div className="text-center">
        {running && <><h2 className="text-2xl font-bold text-gray-800">Installing...</h2></>}
        {status === 'success' && <><h2 className="text-2xl font-bold text-green-500">Done!</h2></>}
        {status === 'error' && !running && <><h2 className="text-2xl font-bold text-red-500">Error</h2></>}
      </div>
      <div className="card">
        <h3 className="font-medium text-gray-700 mb-4">Output</h3>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
          {output || 'Waiting...'}
          {running && <span className="animate-pulse">|</span>}
        </div>
      </div>
      {!running && <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">Back</button>
        <button onClick={onDone} className="btn-primary flex-1">Home</button>
      </div>}
    </div>
  );
}
