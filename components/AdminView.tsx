
import React, { useState, useEffect } from 'react';
import { User, Language, Medicine, EmergencyLog, Alert, CheckInLog } from '../types';
import { TRANSLATIONS } from '../constants';
import { Db } from '../services/db';
import { supabase } from '../services/supabase';
import { ChatRoom } from './ChatRoom';
import { Logo } from './Logo';
import { SummaryWidget } from './SummaryWidget';

interface AdminViewProps {
  user: User;
  language: Language;
  onLogout?: () => void;
  onSwitchRoom?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ user, language, onLogout, onSwitchRoom }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'chat' | 'settings'>('dashboard');
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [sosHistory, setSosHistory] = useState<EmergencyLog[]>([]);
  const [checkInHistory, setCheckInHistory] = useState<CheckInLog[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('09:00');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const t = TRANSLATIONS[language];

  const refreshData = async () => {
    if (!user.activeRoomId) return;
    const rid = user.activeRoomId;
    try {
      const [room, currentMeds, history, checkIns, currentMembers, alerts] = await Promise.all([
        Db.getRoomById(rid),
        Db.getMeds(rid),
        Db.getSOSHistory(rid),
        Db.getCheckInHistory(rid),
        Db.getRoomMembers(rid),
        Db.getAlerts(rid)
      ]);
      setRoomData(room);
      setMeds(currentMeds);
      setSosHistory(history);
      setCheckInHistory(checkIns);
      setMembers(currentMembers);
      setActiveAlerts(alerts);
    } catch (err) {
      console.error("Refresh failed", err);
    }
  };

  useEffect(() => {
    if (!user.activeRoomId) return;
    const rid = user.activeRoomId;

    refreshData();

    const alertChannel = supabase
      .channel(`room-activity-${rid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkin_logs' }, () => refreshData())
      .subscribe();

    const activityInterval = setInterval(() => {
      Db.updateLastSeen(user.id);
      refreshData();
    }, 30000);

    return () => {
      supabase.removeChannel(alertChannel);
      clearInterval(activityInterval);
    };
  }, [user.activeRoomId, user.id]);

  const addMed = async () => {
    if (!newMedName || !user.activeRoomId) return;
    const med: Medicine = {
      id: Math.random().toString(36).substr(2, 9),
      familyRoomId: user.activeRoomId,
      elderUserId: 'default',
      medicineName: newMedName,
      timings: [newMedTime],
      daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      notes: ''
    };
    await Db.saveMed(med);
    await refreshData();
    setNewMedName('');
    setShowAddForm(false);
  };

  const deleteMed = async (id: string) => {
    if (confirm("Delete this schedule?")) {
      await Db.deleteMed(id);
      await refreshData();
    }
  };

  const resolveAlert = async (id: string) => {
    await Db.resolveAlert(id);
    await refreshData();
  };

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Online';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Logo size="sm" showText={false} />
          <h1 className="text-xl font-black text-slate-800 truncate max-w-[200px]">{roomData?.name || 'Family Room'}</h1>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] font-black uppercase text-slate-400">Live</span>
        </div>
      </header>

      {/* SOS BANNER */}
      {activeAlerts.length > 0 && (
        <div className="bg-rose-600 text-white px-6 py-4 flex flex-col gap-2 animate-pulse shadow-2xl relative z-[100]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">{t.emergencyAlert}</span>
                <p className="text-lg font-black leading-tight">{activeAlerts[0].message}</p>
              </div>
            </div>
            <button onClick={() => resolveAlert(activeAlerts[0].id)} className="bg-white text-rose-600 px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg">Resolve</button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {activeTab === 'dashboard' && (
          <>
            <SummaryWidget meds={meds} title="Family Status" />
            
            <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="font-black text-slate-800 flex items-center gap-3"><i className="fa-solid fa-users text-emerald-500"></i> Family Activity</h3>
              </div>
              <div className="divide-y">
                {members.sort((a:any, b:any) => (b.lastSeen || 0) - (a.lastSeen || 0)).map((member: any) => (
                  <div key={member.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-xl border-2 border-white shadow-sm">
                        {member.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{member.username}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${formatLastSeen(member.lastSeen) === 'Online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <p className={`text-[10px] font-black uppercase ${formatLastSeen(member.lastSeen) === 'Online' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formatLastSeen(member.lastSeen)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="font-black text-slate-800"><i className="fa-solid fa-pills mr-2 text-blue-500"></i>Medicine Schedule</h3>
                <button onClick={() => setShowAddForm(!showAddForm)} className="bg-blue-50 text-blue-600 w-8 h-8 rounded-lg"><i className={`fa-solid ${showAddForm ? 'fa-xmark' : 'fa-plus'}`}></i></button>
              </div>
              {showAddForm && (
                <div className="p-6 bg-slate-50 space-y-3">
                  <input type="text" placeholder="Med Name" value={newMedName} onChange={e => setNewMedName(e.target.value)} className="w-full p-3 rounded-xl border outline-none font-bold" />
                  <div className="flex gap-2">
                    <input type="time" value={newMedTime} onChange={e => setNewMedTime(e.target.value)} className="flex-1 p-3 rounded-xl border font-bold" />
                    <button onClick={addMed} className="bg-blue-600 text-white px-6 rounded-xl font-black">Add</button>
                  </div>
                </div>
              )}
              <div className="divide-y">
                {meds.map(med => (
                  <div key={med.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${med.takenToday ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        <i className={`fa-solid ${med.takenToday ? 'fa-check-double' : 'fa-clock'}`}></i>
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{med.medicineName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{med.timings[0]}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteMed(med.id)} className="text-slate-300 hover:text-rose-500 p-2"><i className="fa-solid fa-trash-can"></i></button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800">Family Activity Logs</h2>
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Events</h3>
              {[...sosHistory.map(s => ({...s, type: 'SOS'})), ...checkInHistory.map(c => ({...c, type: 'CHECKIN'}))]
                .sort((a,b) => b.timestamp - a.timestamp)
                .map((log: any, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-3xl border-2 border-slate-50 flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${log.type === 'SOS' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      <i className={`fa-solid ${log.type === 'SOS' ? 'fa-triangle-exclamation' : 'fa-hand-holding-heart'}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-black text-slate-800 truncate">
                          {members.find(m => m.id === log.elderUserId)?.username || 'Elder'}
                        </span>
                        <span className="text-[10px] font-black text-slate-400">{formatTime(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-tight">{log.message}</p>
                      {log.type === 'SOS' && !log.resolvedStatus && (
                        <div className="mt-2 text-[10px] font-black text-rose-600 uppercase tracking-widest animate-pulse">PENDING RESOLUTION</div>
                      )}
                    </div>
                  </div>
                ))}
              {(sosHistory.length === 0 && checkInHistory.length === 0) && (
                <div className="p-10 text-center text-slate-300 font-bold italic">No activity logs yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && <div className="h-[calc(100vh-180px)]"><ChatRoom user={user} language={language} /></div>}

        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">
             <div onClick={() => copyToClipboard(roomData?.join_code || roomData?.joinCode)} className={`p-8 rounded-[2rem] shadow-xl relative overflow-hidden cursor-pointer ${copySuccess ? 'bg-emerald-600' : 'bg-blue-600'} text-white`}>
               <p className="text-xs font-black opacity-80 uppercase tracking-widest mb-2">Family Invite Code</p>
               <div className="flex items-center justify-between">
                <p className="text-4xl font-black tracking-[0.2em]">{roomData?.join_code || roomData?.joinCode || "---"}</p>
                <i className={`fa-solid ${copySuccess ? 'fa-check' : 'fa-copy'} text-xl`}></i>
               </div>
               <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-3">{copySuccess ? 'Copied!' : 'Tap to copy'}</p>
             </div>
             
             <div className="grid grid-cols-1 gap-4 pt-4">
               <button onClick={onSwitchRoom} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm font-black text-slate-700 flex items-center justify-center gap-3 active:scale-95">
                <i className="fa-solid fa-repeat text-blue-500"></i> Switch Family Room
               </button>
               <button onClick={onLogout} className="w-full bg-rose-50 text-rose-600 p-6 rounded-3xl border border-rose-100 font-black flex items-center justify-center gap-3 active:scale-95">
                <i className="fa-solid fa-power-off"></i> Logout
               </button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-4 flex justify-around safe-area-bottom shadow-lg z-40">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-300'}`}>
          <i className="fa-solid fa-house-chimney text-xl"></i>
          <span className="text-[10px] font-black uppercase">Home</span>
        </button>
        <button onClick={() => setActiveTab('logs')} className={`flex flex-col items-center gap-1 ${activeTab === 'logs' ? 'text-blue-600' : 'text-slate-300'}`}>
          <i className="fa-solid fa-clipboard-list text-xl"></i>
          <span className="text-[10px] font-black uppercase">History</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-300'}`}>
          <i className="fa-solid fa-comment-dots text-xl"></i>
          <span className="text-[10px] font-black uppercase">Chat</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-300'}`}>
          <i className="fa-solid fa-gear text-xl"></i>
          <span className="text-[10px] font-black uppercase">Tools</span>
        </button>
      </nav>
    </div>
  );
};
