"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import AIChatDisplay from './display';
import { prepareDataContext } from './service';

export default function AIChatControl({ participants, measurements }: { participants: any[]; measurements: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const dataContext = prepareDataContext(participants, measurements);

  const { messages, append, isLoading, input, handleInputChange, setInput, error } = useChat({
    api: '/api/chat',
    body: {
      dataContext: dataContext
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  return (
    <AIChatDisplay
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      messages={messages}
      append={append}
      isLoading={isLoading}
      input={input}
      handleInputChange={handleInputChange}
      setInput={setInput}
      error={error}
      messagesEndRef={messagesEndRef}
    />
  );
}
