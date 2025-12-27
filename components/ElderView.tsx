
import React, { useState, useEffect, useRef } from 'react';
import { User, Language, Medicine, Alert } from '../types';
import { TRANSLATIONS } from '../constants';
import { Db } from '../services/db';
import { ChatRoom } from './ChatRoom';
import { SummaryWidget } from './SummaryWidget';

interface ElderViewProps {
  user: User;
  language: Language;
  onSwitchRoom?: () => void;
}

export const ElderView: React.FC<ElderViewProps> = ({ user, language, onSwitchRoom }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'chat'>('home');
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [sosTaps, setSosTaps] = useState(0);
  const [sosActive, setSosActive] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [checkedInToday, setCheckedInToday] = useState(false);
  const t = TRANSLATIONS[language];
  
  const sosEscalationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user.activeRoomId) return;
    const load = async () => {
      const currentMeds = await Db.getMeds(user.activeRoomId!);
      const room = await Db.getRoomById(user.activeRoomId!);
      setMeds(currentMeds);
      setRoomName(room?.name || 'Home');
    };
    load();

    const medCheckInterval = setInterval(() => {
      checkOverdueMedicines();
    }, 60000);

    const activity = setInterval(() => Db.updateLastSeen(user.id), 30000);
    return () => {
      clearInterval(activity);
      clearInterval(medCheckInterval);
      if (sosEscalationTimer.current) clearTimeout(sosEscalationTimer.current);
    };
  }, [user.activeRoomId, user.id]);

  useEffect(() => {
    if (sosTaps >= 3) {
      triggerSOS();
      setSosTaps(0);
    }
    const timer = setTimeout(() => setSosTaps(0), 2000);
    return () => clearTimeout(timer);
  }, [sosTaps]);

  const checkOverdueMedicines = () => {
    const now = new Date();
    meds.forEach(async (med) => {
      if (med.takenToday) return;
      if (!med.timings[0]) return;
      const [hours, minutes] = med.timings[0].split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      const diffMinutes = (now.getTime() - scheduledTime.getTime()) / 60000;
      if (diffMinutes >= 20 && diffMinutes < 21) {
        const alert: Alert = {
          id: 'med-missed-' + Date.now(),
          type: 'MED_MISSED',
          fromUserId: user.id,
          fromUsername: user.username,
          message: `💊 MEDICINE MISSED: ${user.username} has not taken ${med.medicineName}`,
          timestamp: Date.now(),
          callTriggeredAt: Date.now() + 60000,
          isCallActive: false,
          status: 'active'
        };
        await Db.triggerSOS(alert, user.activeRoomId!);
      }
    });
  };

  const handleCheckIn = async () => {
    if (checkedInToday || !user.activeRoomId) return;
    try {
      await Db.logCheckIn(user.id, user.activeRoomId, "I am doing well! Checked in via app.");
      setCheckedInToday(true);
      setTimeout(() => setCheckedInToday(false), 3600000); // Allow checking in again in an hour for testing
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSOS = async () => {
    if (!user.activeRoomId) return;
    setSosActive(true);
    const alertId = 'sos-' + Date.now();
    const alert: Alert = {
      id: alertId,
      type: 'SOS',
      fromUserId: user.id,
      fromUsername: user.username,
      message: `🚨 EMERGENCY SOS from ${user.username}`,
      timestamp: Date.now(),
      callTriggeredAt: Date.now() + 300000,
      isCallActive: false,
      status: 'active'
    };
    await Db.triggerSOS(alert, user.activeRoomId);

    sosEscalationTimer.current = setTimeout(async () => {
      console.log("ESCALATION: Triggering emergency phone call simulation...");
    }, 300000);

    setTimeout(() => setSosActive(false), 5000);
  };

  const toggleMed = async (id: string, currentStatus?: boolean) => {
    await Db.toggleMed(id, !currentStatus);
    setMeds(prev => prev.map(m => m.id === id ? { ...m, takenToday: !currentStatus } : m));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-64">
        {activeTab === 'home' ? (
          <div className="p-4 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <i className="fa-solid fa-house-user"></i>
                </div>
                <h1 className="text-2xl font-black text-slate-800 truncate max-w-[180px]">{roomName}</h1>
              </div>
            </div>

            <SummaryWidget meds={meds} title={user.username} isElder={true} />

            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-2 gap-5">
                <button 
                  onClick={handleCheckIn}
                  className={`elder-btn text-white p-6 h-48 rounded-[3rem] shadow-xl flex flex-col items-center justify-center gap-4 transition-all ${checkedInToday ? 'bg-slate-400 opacity-60 scale-95' : 'bg-emerald-600 border-b-8 border-emerald-800 active:translate-y-1 active:border-b-4'}`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl ${checkedInToday ? 'bg-white/10' : 'bg-white/20'}`}>
                    <i className={`fa-solid ${checkedInToday ? 'fa-check' : 'fa-hand-holding-heart'}`}></i>
                  </div>
                  <span className="font-black text-xl text-center leading-tight">{checkedInToday ? 'DONE' : t.checkIn}</span>
                </button>
                
                <button 
                  onClick={() => window.open('tel:100')}
                  className="elder-btn bg-blue-700 text-white p-6 h-48 rounded-[3rem] shadow-xl flex flex-col items-center justify-center gap-4 border-b-8 border-blue-900 active:translate-y-1 active:border-b-4 transition-all"
                >
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                    <i className="fa-solid fa-phone-volume"></i>
                  </div>
                  <span className="font-black text-xl text-center leading-tight">{t.callFamily}</span>
                </button>
              </div>

              <button 
                onClick={() => document.getElementById('med-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="elder-btn bg-amber-500 text-white p-8 rounded-[3rem] shadow-xl flex items-center justify-center gap-6 border-b-8 border-amber-700 active:translate-y-1 active:border-b-4 transition-all"
              >
                <i className="fa-solid fa-pills text-5xl"></i>
                <div className="text-left">
                  <span className="font-black text-3xl block">{t.meds}</span>
                  <span className="text-lg font-bold opacity-90">{meds.filter(m => !m.takenToday).length} Remaining</span>
                </div>
              </button>
            </div>

            <div id="med-section" className="bg-white p-8 rounded-[3.5rem] shadow-sm border-2 border-slate-50">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <i className="fa-solid fa-calendar-check text-blue-600"></i>
                {t.meds}
              </h3>
              <div className="space-y-5">
                {meds.length > 0 ? meds.map(med => (
                  <div 
                    key={med.id} 
                    onClick={() => toggleMed(med.id, med.takenToday)} 
                    className={`p-6 rounded-[2rem] border-4 transition-all flex items-center justify-between active:scale-95 ${med.takenToday ? 'bg-slate-50 border-emerald-200 opacity-60' : 'bg-white border-blue-100 shadow-md'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${med.takenToday ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        <i className={`fa-solid ${med.takenToday ? 'fa-check' : 'fa-clock'}`}></i>
                      </div>
                      <div>
                        <span className="text-2xl font-black text-slate-800 block mb-1">{med.medicineName}</span>
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{med.timings[0]}</span>
                      </div>
                    </div>
                    {med.takenToday && <i className="fa-solid fa-circle-check text-emerald-500 text-4xl"></i>}
                  </div>
                )) : (
                  <p className="text-center py-10 font-black text-slate-300 italic text-xl">No Medicines Today</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-220px)] p-4 animate-fade-in">
             <ChatRoom user={user} language={language} />
          </div>
        )}
      </main>

      {/* FIXED ACTION & NAVIGATION STACK */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        
        {/* SOS BUTTON */}
        <div className="p-4 pointer-events-auto">
          <button 
            onClick={() => setSosTaps(s => s + 1)} 
            className={`w-full py-8 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center border-b-8 transition-all active:translate-y-1 active:border-b-2 ${sosActive ? 'bg-yellow-500 border-yellow-700 animate-pulse' : 'bg-rose-600 border-rose-900'}`}
          >
            <div className="flex items-center gap-6 text-white">
              <i className="fa-solid fa-triangle-exclamation text-5xl"></i>
              <span className="text-6xl font-black">{sosActive ? 'SENT!' : 'SOS'}</span>
            </div>
            {sosActive ? (
               <span className="text-white text-sm font-black uppercase mt-2 tracking-[0.2em]">{t.sosCallNotice}</span>
            ) : sosTaps > 0 ? (
              <div className="mt-2 bg-white/20 px-6 py-1 rounded-full">
                <span className="text-white text-xl font-black uppercase">Tap {3 - sosTaps} more</span>
              </div>
            ) : null}
          </button>
        </div>

        {/* ELDER NAVIGATION BAR */}
        <div className="bg-white/90 backdrop-blur-xl border-t-4 border-slate-100 p-6 safe-area-bottom pointer-events-auto flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex flex-col items-center gap-2 ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-300'}`}
          >
            <i className={`fa-solid ${activeTab === 'home' ? 'fa-house-chimney' : 'fa-house'} text-4xl`}></i>
            <span className="text-xs font-black uppercase tracking-widest">Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('chat')} 
            className={`flex flex-col items-center gap-2 ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-300'}`}
          >
            <i className={`fa-solid ${activeTab === 'chat' ? 'fa-comment-dots' : 'fa-comment'} text-4xl`}></i>
            <span className="text-xs font-black uppercase tracking-widest">Chat</span>
          </button>

          <button 
            onClick={onSwitchRoom} 
            className="flex flex-col items-center gap-2 text-slate-300 active:text-blue-600"
          >
            <i className="fa-solid fa-repeat text-4xl"></i>
            <span className="text-xs font-black uppercase tracking-widest">Rooms</span>
          </button>
        </div>
      </div>
    </div>
  );
};
