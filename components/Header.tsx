
import React from 'react';
import { User, UserRole } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onNavigate: (page: 'dashboard' | 'agent' | 'history' | 'admin') => void;
  currentPage: string;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onNavigate, currentPage }) => {
  return (
    <header className="bg-white border-b border-orange-50 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => onNavigate('dashboard')}
        >
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">O</div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">Orbit</span>
        </div>

        <nav className="hidden lg:flex items-center gap-10">
          {[
            { id: 'dashboard', label: 'Explore' },
            { id: 'agent', label: 'Orbit Agent' },
            { id: 'history', label: 'My Travels' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`text-xs font-black uppercase tracking-widest transition-all relative ${currentPage === item.id ? 'text-orange-500' : 'text-slate-400 hover:text-slate-900'}`}
            >
              {item.label}
              {currentPage === item.id && <span className="absolute -bottom-2 left-0 w-full h-1 bg-orange-500 rounded-full"></span>}
            </button>
          ))}
          {user.role === UserRole.ADMIN && (
            <button 
              onClick={() => onNavigate('admin')}
              className={`text-xs font-black uppercase tracking-widest transition-all ${currentPage === 'admin' ? 'text-green-600' : 'text-slate-400 hover:text-green-600'}`}
            >
              Admin Central
            </button>
          )}
        </nav>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900">{user.username.toUpperCase()}</p>
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-tighter">{user.role}</p>
          </div>
          <button 
            onClick={onLogout}
            className="px-5 py-2 text-xs font-black text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
