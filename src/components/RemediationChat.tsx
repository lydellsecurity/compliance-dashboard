/**
 * AI Remediation Chat Component
 *
 * Interactive AI assistant that helps users fix specific compliance gaps.
 * Takes control context (ID, title, gap analysis) and provides
 * conversational guidance for remediation.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Bot, User, Copy, Check, Loader2, AlertCircle,
  Terminal, Shield, FileText, Sparkles,
  RefreshCw, Maximize2, Minimize2
} from 'lucide-react';
import type { MasterControl, FrameworkMapping } from '../constants/controls';

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface RemediationChatProps {
  control: MasterControl;
  userAnswer?: 'yes' | 'no' | 'partial' | 'na' | null;
  userNotes?: string;
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_PROMPTS = [
  { label: 'How do I fix this?', icon: <Shield className="w-3.5 h-3.5" /> },
  { label: 'Show me CLI commands', icon: <Terminal className="w-3.5 h-3.5" /> },
  { label: 'What evidence do I need?', icon: <FileText className="w-3.5 h-3.5" /> },
  { label: 'Explain this control', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

// ============================================================================
// HELPERS
// ============================================================================

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function buildContextSummary(
  control: MasterControl,
  userAnswer?: string | null,
  userNotes?: string
): string {
  const frameworkList = control.frameworkMappings
    .map((f: FrameworkMapping) => `${f.frameworkId} ${f.clauseId}`)
    .join(', ');

  let statusContext = '';
  if (userAnswer === 'no') {
    statusContext = 'The user has indicated this control is NOT implemented (Critical Gap).';
  } else if (userAnswer === 'partial') {
    statusContext = 'The user has indicated this control is PARTIALLY implemented.';
  } else if (userAnswer === 'yes') {
    statusContext = 'The user has indicated this control IS implemented but may need verification guidance.';
  }

  return `
Control ID: ${control.id}
Control Title: ${control.title}
Domain: ${control.domain}
Risk Level: ${control.riskLevel.toUpperCase()}
Frameworks: ${frameworkList}

Description: ${control.description}

Guidance: ${control.guidance}

Evidence Examples: ${control.evidenceExamples.join('; ')}

Remediation Tip: ${control.remediationTip}

${statusContext}
${userNotes ? `User Notes: ${userNotes}` : ''}
`.trim();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-steel-700 text-slate-400 hover:text-slate-600 dark:hover:text-steel-300 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => (
  <div className="relative group my-2">
    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 dark:bg-black rounded-t-lg border-b border-slate-700">
      <span className="text-xs text-slate-400 font-mono">{language || 'bash'}</span>
      <CopyButton text={code} />
    </div>
    <pre className="p-3 bg-slate-900 dark:bg-black/80 rounded-b-lg text-sm text-slate-100 overflow-x-auto font-mono whitespace-pre-wrap">
      {code}
    </pre>
  </div>
);

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Parse markdown-style code blocks
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (match) {
          const [, lang, code] = match;
          return <CodeBlock key={idx} code={code.trim()} language={lang} />;
        }
      }

      // Handle inline code
      const inlineCode = part.split(/(`[^`]+`)/g);
      return (
        <span key={idx}>
          {inlineCode.map((segment, i) => {
            if (segment.startsWith('`') && segment.endsWith('`')) {
              return (
                <code key={i} className="px-1.5 py-0.5 bg-slate-200 dark:bg-steel-700 rounded text-sm font-mono text-accent-500 dark:text-accent-400">
                  {segment.slice(1, -1)}
                </code>
              );
            }
            return segment;
          })}
        </span>
      );
    });
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="px-3 py-1.5 bg-slate-100 dark:bg-steel-800 rounded-full text-xs text-slate-500 dark:text-steel-400">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${isUser
          ? 'bg-accent-500 text-white'
          : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
        }
      `}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message */}
      <div className={`
        max-w-[80%] rounded-2xl px-4 py-3
        ${isUser
          ? 'bg-accent-500 text-white rounded-tr-sm'
          : 'bg-slate-100 dark:bg-steel-800 text-primary rounded-tl-sm'
        }
      `}>
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {renderContent(message.content)}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RemediationChat: React.FC<RemediationChatProps> = ({
  control,
  userAnswer,
  userNotes,
  isOpen,
  onClose,
  companyName = 'your organization',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Build context on mount
  const controlContext = useCallback(() =>
    buildContextSummary(control, userAnswer, userNotes),
    [control, userAnswer, userNotes]
  );

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `I'm here to help you remediate **${control.id}: ${control.title}**.

${userAnswer === 'no' ? '⚠️ This control is marked as a **Critical Gap**. Let me help you implement it.' :
  userAnswer === 'partial' ? '🔄 This control is **partially implemented**. I can help you complete it.' :
  '✅ I can help you verify your implementation or gather the right evidence.'}

What would you like help with? You can ask me:
- How to implement this control
- What CLI commands to run
- What evidence auditors need
- Specific questions about ${control.title}`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, control, userAnswer, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages
        .filter(m => m.role !== 'system' && !m.isLoading)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch('/.netlify/functions/ai-remediation-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlContext: controlContext(),
          userMessage: content.trim(),
          conversationHistory,
          companyName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Replace loading message with actual response
      setMessages(prev =>
        prev.map(m =>
          m.isLoading
            ? { ...m, content: data.response, isLoading: false }
            : m
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      // Remove loading message on error
      setMessages(prev => prev.filter(m => !m.isLoading));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const resetChat = useCallback(() => {
    setError(null);
    // Create fresh welcome message
    const welcomeMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: `I'm here to help you remediate **${control.id}: ${control.title}**.

${userAnswer === 'no' ? '⚠️ This control is marked as a **Critical Gap**. Let me help you implement it.' :
  userAnswer === 'partial' ? '🔄 This control is **partially implemented**. I can help you complete it.' :
  '✅ I can help you verify your implementation or gather the right evidence.'}

What would you like help with? You can ask me:
- How to implement this control
- What CLI commands to run
- What evidence auditors need
- Specific questions about ${control.title}`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [control, userAnswer]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-backdrop"
          />

          {/* Chat Modal */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed right-0 top-0 h-full modal-content z-50 shadow-2xl flex flex-col
              ${isExpanded ? 'w-full max-w-4xl' : 'w-full max-w-lg'}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-steel-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-primary">Remediation Assistant</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      {control.id}
                    </span>
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded
                      ${control.riskLevel === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                        control.riskLevel === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      }
                    `}>
                      {control.riskLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetChat}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-steel-800 text-slate-500 dark:text-steel-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {messages.map(message => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to get response</p>
                  <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
                </div>
              </div>
            )}

            {/* Quick Prompts */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(prompt.label)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-steel-800 hover:bg-slate-200 dark:hover:bg-steel-700 text-secondary rounded-full transition-colors disabled:opacity-50"
                    >
                      {prompt.icon}
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-steel-700">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this control..."
                    rows={1}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-steel-800 border border-slate-200 dark:border-steel-700 rounded-xl text-sm text-primary placeholder-slate-400 dark:placeholder-steel-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:opacity-50"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-steel-500 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RemediationChat;
