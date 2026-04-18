'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Loader2, Search, Globe, TicketCheck, ShieldCheck, User, Mic } from 'lucide-react';
import type { ChatMessage } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasParts = 'parts' in message && Array.isArray(message.parts) && (message.parts?.length ?? 0) > 0;

  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexDirection: isUser ? 'row-reverse' : 'row', animation: 'fadeIn 0.2s ease' }}>
      {/* Avatar */}
      <div style={{
        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? '#3b82f6' : '#eff6ff',
        border: isUser ? 'none' : '1px solid #bfdbfe',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser
          ? <User size={14} color="white" />
          : <ShieldCheck size={15} color="#2563eb" />
        }
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '82%',
        padding: '0.65rem 0.9rem',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? '#2563eb' : '#ffffff',
        color: isUser ? '#ffffff' : '#1e293b',
        border: isUser ? 'none' : '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
        fontSize: '0.875rem',
        lineHeight: 1.6,
      }}>

        {/* Voice badge */}
        {message.isVoice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', opacity: 0.65, fontSize: '0.7rem' }}>
            <Mic size={10} /> Voice
          </div>
        )}

        {/* Plain content (no parts) */}
        {!hasParts && message.content && (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
        )}

        {/* Parts-based rendering (AI SDK UIMessage format) */}
        {hasParts && message.parts!.map((part, i) => {
          switch (part.type) {
            case 'text':
              return (
                <div key={i} className="prose-widget">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 0.5rem 0', whiteSpace: 'pre-wrap' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: '0.2rem' }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                      em: ({ children }) => <em>{children}</em>,
                      code: ({ inline, children, ...props }: any) =>
                        inline
                          ? <code style={{ background: 'rgba(0,0,0,0.08)', borderRadius: '3px', padding: '0 4px', fontSize: '0.8em', fontFamily: 'monospace' }} {...props}>{children}</code>
                          : <pre style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '6px', padding: '0.5rem', overflowX: 'auto', margin: '0.4rem 0' }}><code style={{ fontFamily: 'monospace', fontSize: '0.8em' }} {...props}>{children}</code></pre>,
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                          style={{ color: isUser ? '#bfdbfe' : '#2563eb', textDecoration: 'underline', overflowWrap: 'anywhere' }}>
                          {children}
                        </a>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote style={{ borderLeft: '3px solid rgba(0,0,0,0.15)', paddingLeft: '0.75rem', margin: '0.4rem 0', opacity: 0.85 }}>{children}</blockquote>
                      ),
                      h1: ({ children }) => <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{children}</h1>,
                      h2: ({ children }) => <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{children}</h2>,
                      h3: ({ children }) => <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0.4rem 0 0.2rem' }}>{children}</h3>,
                    }}
                  >
                    {part.text ?? ''}
                  </ReactMarkdown>
                </div>
              );

            case 'tool-searchDocuments':
              return part.state === 'input-streaming' || part.state === 'input-available' ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.7 }}>
                  <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  <Search size={11} />
                  <span>Searching knowledge base{part.input?.query ? ` for "${part.input.query}"` : '...'}</span>
                </div>
              ) : null;

            case 'tool-webSearch':
              return part.state === 'input-streaming' || part.state === 'input-available' ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.7 }}>
                  <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  <Globe size={11} />
                  <span>Searching the web...</span>
                </div>
              ) : null;

            case 'tool-escalateToHuman':
              return part.state === 'output-available' ? (
                <div key={i} style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                    <TicketCheck size={14} /> Complaint ticket raised
                  </div>
                  <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '4px 0 0' }}>A city officer will follow up shortly.</p>
                </div>
              ) : part.state === 'input-available' || part.state === 'input-streaming' ? (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.7 }}>
                  <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  <TicketCheck size={11} />
                  <span>Raising civic complaint ticket...</span>
                </div>
              ) : null;

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
