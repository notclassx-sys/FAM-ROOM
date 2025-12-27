
import React, { useState, useEffect } from 'react';
import { User, Language, UserRole, FamilyRoom, UserRoomMembership } from './types';
import { TRANSLATIONS } from './constants';
import { Db } from './services/db';
import { supabase } from './services/supabase';
import { ElderView } from './components/ElderView';
import { AdminView } from './components/AdminView';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>(Language.EN);
  const [step, setStep] = useState<'loading' | 'lang' | 'signin' | 'signup' | 'forgot' | 'username' | 'room' | 'selectRoom' | 'app'>('loading');
  
  const [myMemberships, setMyMemberships] = useState<UserRoomMembership[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userId = session.user.id;
        const cloudUser = await Db.getUserById(userId);
        
        if (cloudUser) {
          setUser(cloudUser);
          setLang(cloudUser.language);
          const memberships = await Db.getUserMemberships(cloudUser.id);
          setMyMemberships(memberships);

          if (cloudUser.activeRoomId && memberships.some(m => m.roomId === cloudUser.activeRoomId)) {
            setStep('app');
          } else if (memberships.length > 0) {
            setStep('selectRoom');
          } else {
            setStep('room');
          }
        } else {
          setStep('username');
        }
      } else {
        setStep('lang');
      }
      setIsLoading(false);
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) checkSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  const t = TRANSLATIONS[lang];

  const handleLanguageSelect = (l: Language) => {
    setLang(l);
    setStep('signin');
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      if (data.user) {
        const existingUser = await Db.getUserById(data.user.id);
        if (existingUser) {
          setUser(existingUser);
          setLang(existingUser.language);
          const memberships = await Db.getUserMemberships(existingUser.id);
          setMyMemberships(memberships);
          setStep(memberships.length > 0 ? 'selectRoom' : 'room');
        } else {
          setStep('username');
        }
      }
    } catch (err: any) {
      setErrorMsg("Invalid email or password.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      if (data.user) {
        setStep('username');
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Sign up failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg("Please enter your email.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccessMsg(t.checkEmailReset);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsername = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("No user found");
      
      const userId = authUser.id;
      const userEmail = authUser.email || email;
      
      const newUser: User = { 
        id: userId, 
        phoneNumber: userEmail, 
        username, 
        language: lang, 
        joinedRooms: [] 
      };
      
      await Db.createUser(newUser);
      setUser(newUser);
      setStep('room');
    } catch (err: any) {
      setErrorMsg("Error creating profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateRoom = async () => {
    if (!user) return;
    setIsLoading(true);
    const room: FamilyRoom = {
      id: 'room-' + Math.random().toString(36).substr(2, 9),
      name: roomName || "Our Family",
      joinCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
      adminUserId: user.id,
      createdAt: Date.now()
    };
    await Db.createRoom(room, user.id);
    const memberships = await Db.getUserMemberships(user.id);
    setMyMemberships(memberships);
    await handleSelectRoom(room.id);
    setIsLoading(false);
  };

  const onJoinRoom = async (role: UserRole) => {
    if (!user || !roomCode) return;
    setIsLoading(true);
    const room = await Db.joinRoom(roomCode, user.id, role);
    if (room) {
      const memberships = await Db.getUserMemberships(user.id);
      setMyMemberships(memberships);
      await handleSelectRoom(room.id);
    } else {
      alert("Invalid Code");
    }
    setIsLoading(false);
  };

  const handleSelectRoom = async (roomId: string) => {
    if (!user) return;
    await Db.updateUserActiveRoom(user.id, roomId);
    setUser({ ...user, activeRoomId: roomId });
    setStep('app');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStep('lang');
  };

  if (step === 'loading' || isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Logo size="lg" className="animate-bounce" />
      <p className="mt-8 text-slate-400 font-black tracking-widest text-[10px] uppercase">Please wait...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">
      {step === 'lang' && (
        <div className="h-screen flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <Logo size="xl" className="mb-12" />
          <h1 className="text-3xl font-black mb-8 text-slate-800">{t.selectLang}</h1>
          <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
            <button onClick={() => handleLanguageSelect(Language.EN)} className="bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl shadow-xl active:scale-95 transition-all">English</button>
            <button onClick={() => handleLanguageSelect(Language.HI)} className="bg-emerald-500 text-white py-6 rounded-3xl font-black text-2xl shadow-xl active:scale-95 transition-all">हिंदी</button>
          </div>
        </div>
      )}

      {(step === 'signin' || step === 'signup') && (
        <div className="h-screen flex flex-col p-8 animate-slide-up overflow-y-auto">
          <button onClick={() => setStep('lang')} className="mb-6 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><i className="fa-solid fa-chevron-left"></i></button>
          
          <div className="flex-1">
            <h2 className="text-4xl font-black mb-2 leading-tight">{step === 'signin' ? t.login : t.signup}</h2>
            <p className="text-slate-400 font-bold mb-10">Welcome back to Fam Room</p>
            
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-2 flex items-center shadow-inner focus-within:border-blue-500 transition-all">
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={t.email} 
                  className="flex-1 bg-transparent px-5 py-4 text-xl font-black outline-none placeholder:text-slate-300" 
                />
              </div>

              <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-2 flex items-center shadow-inner focus-within:border-blue-500 transition-all">
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder={t.password} 
                  className="flex-1 bg-transparent px-5 py-4 text-xl font-black outline-none placeholder:text-slate-300" 
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-8 px-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="w-6 h-6 rounded-lg border-2 border-slate-200 checked:bg-blue-600"
                />
                <span className="text-sm font-black text-slate-600">{t.rememberMe}</span>
              </label>
              {step === 'signin' && (
                <button onClick={() => { setStep('forgot'); setErrorMsg(null); setSuccessMsg(null); }} className="text-sm font-black text-blue-600">{t.forgotPassword}</button>
              )}
            </div>

            {errorMsg && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-black mb-6 flex items-center gap-3">
                <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
              </div>
            )}

            <button 
              onClick={step === 'signin' ? handleSignIn : handleSignUp} 
              className="w-full py-6 rounded-[2rem] font-black text-xl bg-blue-600 text-white shadow-2xl shadow-blue-100 active:scale-95 transition-all mb-6"
            >
              {step === 'signin' ? t.login : t.signup}
            </button>

            <div className="text-center pb-8">
              <button 
                onClick={() => setStep(step === 'signin' ? 'signup' : 'signin')} 
                className="text-sm font-black text-slate-400"
              >
                {step === 'signin' ? t.noAccount : t.hasAccount} <span className="text-blue-600">{step === 'signin' ? t.signup : t.login}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'forgot' && (
        <div className="h-screen flex flex-col p-8 animate-slide-up overflow-y-auto">
          <button onClick={() => setStep('signin')} className="mb-6 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><i className="fa-solid fa-chevron-left"></i></button>
          
          <div className="flex-1">
            <h2 className="text-4xl font-black mb-2 leading-tight">{t.resetPassword}</h2>
            <p className="text-slate-400 font-bold mb-10">We'll send you a link to reset your password</p>
            
            <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-2 flex items-center shadow-inner focus-within:border-blue-500 transition-all mb-8">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder={t.email} 
                className="flex-1 bg-transparent px-5 py-4 text-xl font-black outline-none placeholder:text-slate-300" 
              />
            </div>

            {errorMsg && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-black mb-6 flex items-center gap-3">
                <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-black mb-6 flex items-center gap-3">
                <i className="fa-solid fa-circle-check"></i> {successMsg}
              </div>
            )}

            <button 
              onClick={handleResetPassword} 
              className="w-full py-6 rounded-[2rem] font-black text-xl bg-blue-600 text-white shadow-2xl shadow-blue-100 active:scale-95 transition-all mb-6"
            >
              {t.sendResetLink}
            </button>

            <div className="text-center">
              <button onClick={() => setStep('signin')} className="text-sm font-black text-blue-600">{t.backToLogin}</button>
            </div>
          </div>
        </div>
      )}

      {step === 'username' && (
        <div className="h-screen flex flex-col p-8 animate-slide-up justify-center">
          <h2 className="text-4xl font-black mb-2">{t.welcome}</h2>
          <p className="text-slate-400 font-bold mb-10">{t.setUsername}</p>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Your Name" 
            className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] p-8 text-2xl font-black mb-10 outline-none focus:border-blue-600 transition-all" 
          />
          <button onClick={handleUsername} className="w-full py-7 rounded-[2.5rem] bg-blue-600 text-white font-black text-xl shadow-2xl">Start Journey</button>
        </div>
      )}

      {step === 'selectRoom' && (
        <div className="h-screen flex flex-col p-8 animate-fade-in bg-slate-50 overflow-y-auto">
          <h2 className="text-3xl font-black mb-10">Your Families</h2>
          <div className="space-y-4">
            {myMemberships.map((m) => (
              <button key={m.id} onClick={() => handleSelectRoom(m.roomId)} className="w-full bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100 flex items-center justify-between active:scale-95 transition-all">
                <div className="text-left">
                  <p className="font-black text-xl mb-1">{m.roomName}</p>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{m.role}</span>
                </div>
                <i className="fa-solid fa-chevron-right text-slate-200"></i>
              </button>
            ))}
          </div>
          <div className="mt-12 space-y-4">
            <button onClick={() => setStep('room')} className="w-full bg-white border-2 border-slate-200 py-6 rounded-3xl font-black text-slate-800">+ {t.createRoom}</button>
            <button onClick={handleLogout} className="w-full text-slate-400 font-black py-4">Logout</button>
          </div>
        </div>
      )}

      {step === 'room' && (
        <div className="h-screen flex flex-col p-8 animate-fade-in overflow-y-auto bg-slate-50">
          <h2 className="text-3xl font-black mb-12">Setup Family</h2>
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-slate-100">
              <h3 className="font-black text-blue-600 mb-6 uppercase text-xs tracking-widest">{t.createRoom}</h3>
              <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={t.roomName} className="w-full border-b-2 border-slate-100 py-4 mb-8 text-xl font-black outline-none focus:border-blue-500" />
              <button onClick={onCreateRoom} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg">Start Room</button>
            </div>
            
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-slate-100">
              <h3 className="font-black text-emerald-600 mb-6 uppercase text-xs tracking-widest">{t.joinRoom}</h3>
              <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder={t.joinCode} className="w-full border-b-2 border-slate-100 py-4 mb-8 text-2xl font-black text-center tracking-widest outline-none focus:border-emerald-500" />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => onJoinRoom(UserRole.ELDER)} className="bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm">{t.elder}</button>
                <button onClick={() => onJoinRoom(UserRole.YOUNG)} className="bg-slate-800 text-white py-4 rounded-2xl font-black text-sm">{t.young}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {user && step === 'app' && (
        <div className="animate-fade-in">
          {myMemberships.find(m => m.roomId === user.activeRoomId)?.role === UserRole.ELDER ? (
            <ElderView user={user} language={lang} onSwitchRoom={() => setStep('selectRoom')} />
          ) : (
            <AdminView user={user} language={lang} onLogout={handleLogout} onSwitchRoom={() => setStep('selectRoom')} />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
