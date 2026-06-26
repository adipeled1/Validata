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

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

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
}) {
  const renderToolCall = (toolCall) => {
    if (toolCall.toolName === 'generateGraph') {
      const { chartType, title, data, dataKeys, xAxisKey } = toolCall.args;
      
      const renderChart = () => {
        if (chartType === 'bar') {
          return (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
              {dataKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          );
        }
        if (chartType === 'line') {
          return (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
              {dataKeys.map((key, index) => (
                <Line type="monotone" key={key} dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              ))}
            </LineChart>
          );
        }
        if (chartType === 'pie') {
          return (
            <PieChart>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Pie
                data={data}
                dataKey={dataKeys[0]}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          );
        }
        return <div className="text-sm text-slate-500 dark:text-slate-400">Unsupported chart type.</div>;
      };

      return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mt-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            <BarChart2 className="w-5 h-5" />
            <h4 className="font-semibold text-sm truncate">{title}</h4>
          </div>
          <div className="h-64 w-full">
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-20 right-4 md:bottom-8 md:right-8 z-50 w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 group"
        aria-label="Open AI Analyst Chat"
      >
        <div className="relative">
          <Bot className="w-7 h-7 text-white" />
          <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 md:absolute md:inset-auto md:bottom-24 md:right-8 md:left-8 w-auto h-[100dvh] md:h-[600px] max-h-[100dvh] md:max-h-[80vh] bg-white dark:bg-slate-900 rounded-none md:rounded-2xl shadow-2xl border-0 md:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-10 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Validata AI Analyst</h3>
                <p className="text-xs text-indigo-100 opacity-90">Gemini Powered Assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/50">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900 text-sm mb-4">
                <strong>Error:</strong> {error.message || 'Something went wrong while connecting to AI.'}
              </div>
            )}
            {messages.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-500 dark:text-slate-400">
                <div className="bg-indigo-100 dark:bg-indigo-900/40 p-4 rounded-full text-indigo-500 dark:text-indigo-400 mb-2">
                  <Bot className="w-8 h-8" />
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300">How can I help analyze your data?</p>
                <p className="text-sm max-w-[250px]">
                  Try asking for a comparison of AI Model vs Goniometer measurements, or summary statistics.
                </p>
              </div>
            )}
            
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.content && (
                    <div 
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-tl-sm'
                      }`}
                    >
                      {m.content}
                    </div>
                  )}
                  
                  {m.toolInvocations?.map(toolInvocation => (
                    <div key={toolInvocation.toolCallId} className="w-full mt-2">
                      {toolInvocation.state === 'result' ? (
                        renderToolCall(toolInvocation)
                      ) : (
                        <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Generating analysis...
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300 shadow-sm mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
               <div className="flex gap-3 justify-start">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-1">
                   <Bot className="w-4 h-4" />
                 </div>
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '300ms'}}></div>
                 </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim() || isLoading) return;
                append({ role: 'user', content: input });
                setInput('');
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your data..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-base md:text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-colors border border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input?.trim()}
                className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
