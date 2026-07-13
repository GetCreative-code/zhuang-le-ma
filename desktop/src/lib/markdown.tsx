import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-body prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeText = String(children).replace(/\n$/, '');
            if (!match) return <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
            return (
              <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs"><span>{match[1]}</span></div>
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, padding: '1rem', fontSize: '0.875rem' }}>{codeText}</SyntaxHighlighter>
              </div>
            );
          },
          h1({ children }) { return <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4 pb-2 border-b-2 border-fun-orange">{children}</h1>; },
          h2({ children }) { return <h2 className="text-xl font-bold text-gray-700 mt-5 mb-3">{children}</h2>; },
        }}
      >{content}</ReactMarkdown>
    </div>
  );
}
