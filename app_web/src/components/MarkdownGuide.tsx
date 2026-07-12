import React from 'react';
import MarkdownRenderer from '../lib/markdown';

interface MarkdownGuideProps { content: string; }

export default function MarkdownGuide({ content }: MarkdownGuideProps) {
  return <div><MarkdownRenderer content={content} /></div>;
}
