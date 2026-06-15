"use client";

import React, { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import AIChatWindow from './AIChatWindow';

export default function AIChatBubble({ participants, measurements }) {
  const [isOpen, setIsOpen] = useState(false);

  // Combine data into a simplified context for the AI
  const dataContext = {
    participants: participants.map(p => ({
      id: p.id,
      age: p.age,
      gender: p.gender,
      status: p.status,
      healthStatus: p.healthStatus
    })),
    measurements: measurements.map(m => ({
      participantId: m.participant,
      goniometer: parseFloat(m.goniometer) || m.goniometer,
      aiModel: parseFloat(m.aiModel) || m.aiModel,
      timestamp: m.timestamp
    }))
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 group"
        aria-label="Open AI Analyst Chat"
      >
        <div className="relative">
          <Bot className="w-7 h-7 text-white" />
          <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
        </div>
      </button>

      <AIChatWindow 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        dataContext={dataContext}
      />
    </>
  );
}
