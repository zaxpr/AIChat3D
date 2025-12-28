import React, { useState, useRef, useEffect } from 'react';
import { Message, ModelStatus } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onModelUpload: (file: File) => void;
  onUserTyping: (isTyping: boolean) => void;
  modelStatus: ModelStatus;
  isProcessing: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onModelUpload,
  onUserTyping,
  modelStatus,
  isProcessing
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Notify parent that user is typing
    onUserTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing status after 1 second of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
        onUserTyping(false);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onUserTyping(false);
      onSendMessage(input);
      setInput('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.name.endsWith('.vrm')) {
            onModelUpload(file);
        } else {
            alert('Please select a valid .vrm file');
        }
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      
      {/* Header */}
      <div className="flex-none p-4 border-b border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-between">
        <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">
                Vivian
            </h1>
            <p className="text-xs text-gray-500">History & Controls</p>
        </div>
        
        {/* Upload Button moved to header */}
        <input 
            type="file" 
            accept=".vrm"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden" 
        />
        <button 
            onClick={() => fileInputRef.current?.click()}
            title="Upload .vrm model"
            className="p-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/20 rounded-md transition-colors text-gray-300 flex items-center gap-2"
        >
            <span className="hidden sm:inline">Upload .vrm</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
        </button>
      </div>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4 bg-gray-900/50">
        {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10 text-sm">
                <p>No messages yet.</p>
                <p className="mt-2">Say hello to start the conversation!</p>
            </div>
        )}
        
        {messages.map((msg, idx) => (
            <div 
                key={idx} 
                className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
            >
                <span className="text-[10px] text-gray-500 mb-1 px-1 capitalize">{msg.role === 'model' ? 'Avatar' : 'You'}</span>
                <div 
                    className={`p-3 rounded-2xl text-sm leading-relaxed shadow-md ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-gray-800 text-gray-200 border border-white/5 rounded-tl-sm'
                    }`}
                >
                    <p>{msg.text}</p>
                </div>
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="relative w-full">
            <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={modelStatus === ModelStatus.READY ? "Type a message..." : "Loading..."}
                disabled={isProcessing}
                className="w-full bg-gray-800/80 border border-white/10 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 transition-all placeholder-gray-500 text-sm"
            />
            <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center text-white disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
                {isProcessing ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                )}
            </button>
        </form>
      </div>

    </div>
  );
};