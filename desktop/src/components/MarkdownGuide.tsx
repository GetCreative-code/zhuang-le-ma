import React from 'react';
import MarkdownRenderer from '../lib/markdown';

export default function MarkdownGuide({ content }: { content: string }) {
  return <div><MarkdownRenderer content={content} /></div>;
}
