
import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, isAdmin }) => {
  const menuItems = [
    { id: 'explore', label: 'Explore', icon: '🏛' },
    { id: 'agent', label: 'Orbit AI', icon: '💎' },
    { id: 'history', label: 'Travel Log', icon: '🍷' },
    { id: 'vr', label: 'Maps', icon: '🛰' },
    { id: 'profile', label: 'Profile', icon: '👑' },
  ];

  if (isAdmin) menuItems.push({ id: 'admin', label: 'Admin', icon: '⚙️' });

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-100 flex-col h-full shadow-2xl z-50">
        <div className="p-10 flex items-center gap-5 mb-6">
          <div className="w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white font-black shadow-2xl border-b-4 border-orange-500">O</div>
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-black text-slate-900 tracking-tighter">Orbit</span>
            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-1">Elite Travel</span>
          </div>
        </div>

        <nav className="flex-grow px-6 space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] transition-all duration-500 font-black text-[11px] uppercase tracking-widest ${
                activeTab === item.id 
                  ? 'bg-slate-900 text-white shadow-2xl translate-x-2' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-xl opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-slate-50">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] text-red-400 hover:bg-red-50 transition-all font-black text-[11px] uppercase tracking-widest"
          >
            <span className="text-xl">🚪</span>
            <span>Exit Orbit</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center p-4 z-50 shadow-[0_-15px_30px_rgba(0,0,0,0.08)]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              activeTab === item.id ? 'text-orange-500 scale-110' : 'text-slate-300'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
