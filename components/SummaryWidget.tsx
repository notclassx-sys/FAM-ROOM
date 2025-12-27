
import React from 'react';
import { Medicine } from '../types';

interface SummaryWidgetProps {
  meds: Medicine[];
  title: string;
  isElder?: boolean;
}

export const SummaryWidget: React.FC<SummaryWidgetProps> = ({ meds, title, isElder }) => {
  const totalMeds = meds.length;
  const takenMeds = meds.filter(m => m.takenToday).length;
  const pendingMeds = meds.filter(m => !m.takenToday);
  const progress = totalMeds > 0 ? (takenMeds / totalMeds) * 100 : 0;

  return (
    <div className={`p-6 rounded-[2.5rem] shadow-xl border-2 ${
      isElder 
      ? 'bg-white border-blue-500/10' 
      : 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white border-transparent'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 pr-4">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isElder ? 'text-blue-500' : 'text-blue-200'}`}>
            TODAY'S OVERVIEW
          </p>
          <h3 className={`text-2xl font-black leading-tight mb-1 ${isElder ? 'text-slate-800' : 'text-white'}`}>
            {title}
          </h3>
          <p className={`text-sm font-bold ${isElder ? 'text-slate-400' : 'text-blue-100'}`}>
            {takenMeds} / {totalMeds} tasks completed
          </p>
        </div>
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="absolute w-full h-full -rotate-90 scale-110">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="transparent"
              stroke={isElder ? '#f1f5f9' : 'rgba(255,255,255,0.15)'}
              strokeWidth="8"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="transparent"
              stroke={isElder ? '#2563eb' : '#fff'}
              strokeWidth="8"
              strokeDasharray={213.6}
              strokeDashoffset={213.6 - (213.6 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className={`text-lg font-black ${isElder ? 'text-blue-600' : 'text-white'}`}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {pendingMeds.length > 0 ? (
          <div className={`p-5 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 ${
            isElder 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
            : 'bg-white/15 backdrop-blur-md border border-white/20'
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isElder ? 'bg-white/20' : 'bg-white text-blue-600'
            }`}>
              <i className="fa-solid fa-clock-rotate-left text-xl animate-pulse"></i>
            </div>
            <div className="overflow-hidden">
              <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isElder ? 'text-blue-100' : 'text-blue-200'}`}>
                NEXT REMINDER
              </p>
              <p className="font-black text-lg truncate">
                {pendingMeds[0].medicineName} <span className="opacity-80 font-bold">@ {pendingMeds[0].timings[0]}</span>
              </p>
            </div>
          </div>
        ) : totalMeds > 0 ? (
          <div className={`p-5 rounded-3xl flex items-center gap-4 ${
            isElder 
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
            : 'bg-emerald-500/20 border border-emerald-500/30'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-check-double text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 opacity-80">ALL DONE</p>
              <p className="font-black text-lg leading-none">Perfect! See you later.</p>
            </div>
          </div>
        ) : (
          <div className={`p-5 rounded-3xl flex items-center gap-4 ${
            isElder ? 'bg-slate-100 text-slate-500' : 'bg-white/10'
          }`}>
             <div className="w-12 h-12 rounded-2xl bg-slate-200/50 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-calendar-day text-xl"></i>
            </div>
            <p className="font-bold">No tasks scheduled today.</p>
          </div>
        )}
      </div>
    </div>
  );
};
