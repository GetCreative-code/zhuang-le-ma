import React, { useState } from 'react';

interface FeedbackFormProps { onSubmit: (comment: string) => void; onCancel: () => void; }

export default function FeedbackForm({ onSubmit, onCancel }: FeedbackFormProps) {
  const [comment, setComment] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(comment); }} className="space-y-3">
      <p className="text-gray-600 text-sm font-medium">Help us improve!</p>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went wrong?" className="input-field min-h-[80px] resize-none" rows={3} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="submit" className="btn-primary text-sm">Submit</button>
      </div>
    </form>
  );
}
