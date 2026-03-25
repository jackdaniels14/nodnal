'use client';

import { useState, useEffect, useCallback } from 'react';

interface Props {
  text: string;
  maxLength?: number; // only summarize if text exceeds this length
  className?: string;
}

export default function AiSummary({ text, maxLength = 120, className = '' }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const needsSummary = text.length > maxLength;

  const summarize = useCallback(async () => {
    if (!needsSummary || summary) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          systemPrompt: 'Summarize the following text in 1-2 concise sentences. Be direct and informative. Do not start with "This" or "The text". Just state the key points.',
        }),
      });
      const data = await res.json();
      setSummary(data.content);
    } catch {
      setSummary(null);
    }
    setLoading(false);
  }, [text, needsSummary, summary]);

  useEffect(() => {
    if (needsSummary) summarize();
  }, [needsSummary, summarize]);

  // Short text — just show it directly
  if (!needsSummary) {
    return (
      <p className={`text-sm text-gray-300 leading-relaxed whitespace-pre-wrap ${className}`}>
        {text}
      </p>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 overflow-auto">
        {loading && !summary && (
          <p className="text-xs text-gray-500 italic animate-pulse">Summarizing...</p>
        )}
        {!showRaw && summary && (
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
        )}
        {(showRaw || (!summary && !loading)) && (
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{text}</p>
        )}
      </div>
      {summary && (
        <button
          onClick={() => setShowRaw(v => !v)}
          className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors self-start"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showRaw ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            )}
          </svg>
          {showRaw ? 'Show summary' : 'Show full text'}
        </button>
      )}
    </div>
  );
}
