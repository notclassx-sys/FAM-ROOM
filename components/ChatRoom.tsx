
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import { Db } from '../services/db';
import { supabase } from '../services/supabase';

interface ChatRoomProps {
  user: User;
  language: Language;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ user, language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (!user.activeRoomId) return;

    // Initial Load
    Db.getChat(user.activeRoomId).then(setMessages);

    // Real-time Subscription
    const channel = supabase
      .channel(`room-${user.activeRoomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `family_room_id=eq.${user.activeRoomId}` 
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.activeRoomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user.activeRoomId) return;
    const activeRole = user.joinedRooms.find(r => r.roomId === user.activeRoomId)?.role || UserRole.YOUNG;
    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      familyRoomId: user.activeRoomId,
      userId: user.id,
      username: user.username,
      role: activeRole,
      message: input,
      timestamp: Date.now()
    };
    await Db.sendChatMessage(newMsg);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border">
      <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
        <h3 className="font-bold text-slate-700">{t.chat}</h3>
        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black animate-pulse">LIVE</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === user.id ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] font-bold text-slate-500">{msg.username}</span>
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.userId === user.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
              {msg.message}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholderMsg} className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none" onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
        <button onClick={sendMessage} className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"><i className="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>
  );
};
