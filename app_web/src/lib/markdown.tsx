import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps { content: string; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 text-xs rounded-md bg-white/20 hover:bg-white/40 text-white transition-colors">
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeText = String(children).replace(/\n$/, '');
            const inline = !match;
            if (inline) {
              return <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
            }
            return (
              <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-200">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs"><span>{match[1]}</span></div>
                <CopyButton text={codeText} />
                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, padding: '1rem', fontSize: '0.875rem' }} {...props}>
                  {codeText}
                </SyntaxHighlighter>
              </div>
            );
          },
          h1({ children }) { return <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4 pb-2 border-b-2 border-fun-orange">{children}</h1>; },
          h2({ children }) { return <h2 className="text-xl font-bold text-gray-700 mt-5 mb-3">{children}</h2>; },
          p({ children }) { return <p className="text-gray-600 leading-relaxed mb-3">{children}</p>; },
          a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-fun-blue hover:underline font-medium">{children}</a>; },
          blockquote({ children }) { return <blockquote className="border-l-4 border-fun-orange bg-orange-50 px-4 py-2 my-3 rounded-r-lg text-gray-700 italic">{children}</blockquote>; },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
