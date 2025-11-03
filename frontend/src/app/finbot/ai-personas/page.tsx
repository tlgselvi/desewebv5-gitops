"use client";
import { FC, useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  avatar: string;
  expertise: string[];
}

export default function AIPersonasPage() {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const personas: Persona[] = [
    {
      id: '1',
      name: 'Financial Advisor',
      description: 'Expert in investment strategies and portfolio management',
      avatar: '💼',
      expertise: ['Investments', 'Retirement Planning', 'Risk Management'],
    },
    {
      id: '2',
      name: 'Budget Coach',
      description: 'Helps you create and stick to budgets',
      avatar: '📊',
      expertise: ['Budgeting', 'Expense Tracking', 'Savings Goals'],
    },
    {
      id: '3',
      name: 'Tax Expert',
      description: 'Provides tax planning and optimization advice',
      avatar: '📋',
      expertise: ['Tax Planning', 'Deductions', 'Tax Optimization'],
    },
    {
      id: '4',
      name: 'Debt Counselor',
      description: 'Helps manage and pay off debt strategically',
      avatar: '💳',
      expertise: ['Debt Management', 'Credit Scores', 'Payment Strategies'],
    },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedPersona) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // TODO: Replace with actual API call
    // Simulate API response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Thank you for your question. As a ${selectedPersona.name}, I'm here to help you with ${selectedPersona.expertise.join(', ')}. This is a demo response. In production, this would connect to an AI service.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedPersona) {
    return (
      <div className="p-8">
        <div className="max-w-7xl w-full mx-auto space-y-6">
          <div>
            <Link href="/finbot" className="text-blue-600 hover:text-blue-700 mb-2 inline-block">
              ← FinBot Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🤖 AI Personas
            </h1>
            <p className="text-gray-600">Kişiselleştirilmiş finansal danışmanlık</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {personas.map((persona) => (
              <div
                key={persona.id}
                onClick={() => setSelectedPersona(persona)}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="text-center mb-4">
                  <span className="text-6xl block mb-3">{persona.avatar}</span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {persona.name}
                  </h3>
                  <p className="text-sm text-gray-500">{persona.description}</p>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {persona.expertise.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/finbot" className="text-blue-600 hover:text-blue-700 mb-2 inline-block">
              ← FinBot Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPersona(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedPersona.avatar} {selectedPersona.name}
              </h1>
            </div>
            <p className="text-gray-600 mt-1">{selectedPersona.description}</p>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[600px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <span className="text-4xl mb-2 block">{selectedPersona.avatar}</span>
                <p>Start a conversation with {selectedPersona.name}</p>
                <p className="text-sm mt-2">Ask about {selectedPersona.expertise.join(', ')}</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

