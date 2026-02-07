
import React from 'react';
import { User } from '../types';

const Profile: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-orange-50 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-[80px] opacity-10"></div>
        <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-green-500 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-xl">
          {user.username[0].toUpperCase()}
        </div>
        <h2 className="text-3xl font-black text-slate-900">{user.username}</h2>
        <p className="text-orange-500 font-bold uppercase text-[10px] tracking-widest mt-1">{user.role}</p>
        
        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Currency</p>
             <p className="font-bold text-slate-800">{user.currency}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Points</p>
             <p className="font-bold text-green-600">1,250 O-Pts</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-orange-50">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-2 h-6 bg-green-500 rounded-full"></span> Settings
        </h3>
        <div className="space-y-4">
          {['Notification Preferences', 'Privacy & Security', 'Language Settings', 'Linked Accounts'].map(opt => (
            <button key={opt} className="w-full text-left px-6 py-4 rounded-2xl hover:bg-orange-50 transition-all font-bold text-slate-600 flex justify-between items-center group">
              {opt}
              <span className="text-slate-300 group-hover:text-orange-500">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
