'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@who/shared';
import { MessageSquare, Send, X, Smile } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface LiveChatProps {
  roomCode: string;
  myNickname: string;
  chatMessages: ChatMessage[];
}

const EMOJIS = ['🔥', '🤣', '😱', '🎧', '👑', '👏', '🎶', '💯'];

export const LiveChat: React.FC<LiveChatProps> = ({
  roomCode,
  myNickname,
  chatMessages,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; name: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const handleReaction = (data: { id: string; emoji: string; senderName: string }) => {
      setFloatingReactions((prev) => [...prev, { id: data.id, emoji: data.emoji, name: data.senderName }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== data.id));
      }, 3000);
    };

    socket.on('reaction_received', handleReaction);

    return () => {
      socket.off('reaction_received', handleReaction);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const socket = getSocket();
    socket.emit('send_chat', {
      roomCode,
      senderName: myNickname,
      text: inputMessage,
    });
    setInputMessage('');
  };

  const handleSendEmoji = (emoji: string) => {
    const socket = getSocket();
    socket.emit('send_reaction', {
      roomCode,
      emoji,
      senderName: myNickname,
    });
  };

  return (
    <>
      {/* Floating Animated Reaction Sprites Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((item) => (
          <div
            key={item.id}
            className="absolute bottom-20 right-10 text-4xl animate-bounce-subtle flex flex-col items-center"
            style={{
              animation: 'float 2.5s ease-out forwards',
              right: `${15 + Math.random() * 20}%`,
            }}
          >
            <span>{item.emoji}</span>
            <span className="text-[10px] bg-slate-900/80 px-2 py-0.5 rounded text-white font-bold">
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-2xl bg-gradient-button-purple text-white shadow-glow-purple hover:scale-110 transition flex items-center gap-2 font-bold"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="hidden sm:inline">Chat ao Vivo</span>
          {chatMessages.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 text-xs font-black flex items-center justify-center">
              {chatMessages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat Drawer Sidebar */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm h-[500px] glass-card border-2 border-purple-400/50 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Drawer Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-300" />
              <h3 className="font-bold text-white text-base">Chat & Provocações</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.map((msg) => {
              if (msg.isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="text-center my-2 text-[11px] font-bold text-cyan-300 bg-cyan-400/10 py-1 px-3 rounded-full border border-cyan-400/20"
                  >
                    {msg.text}
                  </div>
                );
              }

              const isMe = msg.senderName === myNickname;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col text-xs ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-blue-200/70 font-semibold mb-0.5">
                    {msg.senderName}
                  </span>
                  <div
                    className={`p-2.5 rounded-2xl max-w-[85%] font-medium ${
                      isMe
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : 'bg-white/15 text-white rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reaction Bar */}
          <div className="p-2 border-t border-white/10 flex justify-between bg-slate-950/40">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendEmoji(emoji)}
                className="p-1.5 hover:scale-125 transition text-lg"
                title={`Reagir ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-2 bg-slate-900/60">
            <input
              type="text"
              placeholder="Digite uma provocação..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/50 text-xs focus:outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
