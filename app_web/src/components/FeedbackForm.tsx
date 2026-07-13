import React, { useState } from 'react';

export default function FeedbackForm({ onSubmit, onCancel }: { onSubmit: (c: string) => void; onCancel: () => void }) {
  const [comment, setComment] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(comment); }} className="space-y-3">
      <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="What went wrong..." className="input-field min-h-[80px] resize-none" rows={3} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="submit" className="btn-primary text-sm">Submit</button>
      </div>
    </form>
  );
}
