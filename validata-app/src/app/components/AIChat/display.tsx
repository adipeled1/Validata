import React from 'react';
import { Send, X, Bot, User, BarChart2, Loader2, Sparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#9d7fea', '#f0a500', '#4ec9b0', '#f14c4c', '#569cd6'];

interface AIChatDisplayProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  messages: any[];
  append: (msg: any) => void;
  isLoading: boolean;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setInput: (v: string) => void;
  error: any;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function AIChatDisplay({
  isOpen,
  setIsOpen,
  messages,
  append,
  isLoading,
  input,
  handleInputChange,
  setInput,
  error,
  messagesEndRef
}: AIChatDisplayProps) {
  const renderToolCall = (toolCall: any) => {
    if (toolCall.toolName === 'generateGraph') {
      const { chartType, title, data, dataKeys, xAxisKey } = toolCall.args;

      const renderChart = () => {
        const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 };
        const gridStyle = { stroke: 'var(--border)', strokeDasharray: '3 3' };

        if (chartType === 'bar') {
          return (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} vertical={false} stroke={gridStyle.stroke} />
              <XAxis dataKey={xAxisKey} tick={axisStyle} angle={-45} textAnchor="end" />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
              {dataKeys.map((key: string, index: number) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[2, 2, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          );
        }
        if (chartType === 'line') {
          return (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray={gridStyle.strokeDasharray} vertical={false} stroke={gridStyle.stroke} />
              <XAxis dataKey={xAxisKey} tick={axisStyle} angle={-45} textAnchor="end" />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
              {dataKeys.map((key: string, index: number) => (
                <Line type="monotone" key={key} dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          );
        }
        if (chartType === 'pie') {
          return (
            <PieChart>
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={data}
                dataKey={dataKeys[0]}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          );
        }
        return <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unsupported chart type.</div>;
      };

      return (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          padding: '12px',
          marginTop: '8px',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
            color: 'var(--accent-soft)',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '6px',
          }}>
            <BarChart2 size={14} />
            <span style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          </div>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* FAB trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 50,
          width: '44px',
          height: '44px',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
        aria-label="Open AI Analyst Chat"
      >
        <div style={{ position: 'relative' }}>
          <Bot size={20} style={{ color: '#fff' }} />
          <Sparkles size={10} style={{ color: '#f0a500', position: 'absolute', top: '-4px', right: '-4px' }} />
        </div>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '68px',
          right: '16px',
          left: '16px',
          height: '520px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--accent)',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={16} style={{ color: '#fff' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Validata AI Analyst</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Gemini Powered Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', padding: '2px' }}
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'var(--bg-panel)',
          }}>
            {error && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(248, 113, 113, 0.08)',
                border: '1px solid var(--status-dropped)',
                fontSize: '11px',
                color: 'var(--status-dropped)',
              }}>
                <strong>Error:</strong> {error.message || 'Something went wrong.'}
              </div>
            )}
            {messages.length === 0 && !error && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '8px',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}>
                <Bot size={32} style={{ color: 'var(--accent-soft)' }} />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>How can I help analyze your data?</div>
                <div style={{ fontSize: '11px', maxWidth: '220px' }}>
                  Try asking for a comparison of AI Model vs Goniometer measurements, or summary statistics.
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: '8px', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role !== 'user' && (
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Bot size={12} style={{ color: '#fff' }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '85%', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.content && (
                    <div style={{
                      padding: '7px 11px',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                      color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                    }}>
                      {m.content}
                    </div>
                  )}

                  {m.toolInvocations?.map((toolInvocation: any) => (
                    <div key={toolInvocation.toolCallId} style={{ width: '100%', marginTop: '4px' }}>
                      {toolInvocation.state === 'result' ? (
                        renderToolCall(toolInvocation)
                      ) : (
                        <div style={{
                          background: 'var(--bg-surface-alt)',
                          border: '1px solid var(--border)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          padding: '5px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                          Generating analysis...
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {m.role === 'user' && (
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--bg-surface-alt)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={12} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={12} style={{ color: '#fff' }} />
                </div>
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  padding: '8px 12px',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                }}>
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: 'var(--accent-soft)',
                        animation: `bounce 1s ${delay}ms infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
            `}</style>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim() || isLoading) return;
                append({ role: 'user', content: input });
                setInput('');
              }}
              style={{ display: 'flex', gap: '8px' }}
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your data..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  padding: '5px 10px',
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input?.trim()}
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'var(--accent)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isLoading || !input?.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !input?.trim() ? 0.5 : 1,
                  flexShrink: 0,
                }}
                aria-label="Send message"
              >
                <Send size={14} style={{ color: '#fff' }} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
