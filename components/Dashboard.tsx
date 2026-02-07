
import React, { useState, useEffect, useRef } from 'react';
import { User, Ticket } from '../types';
import { MOCK_DESTINATIONS } from '../constants';
import { searchGlobalPlace, getPlaceSuggestions } from '../services/geminiService';

interface DashboardProps {
  user: User;
  location: string;
  onConfirm: (ticket: Ticket) => void;
  initialSearch?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, location, onConfirm, initialSearch = "" }) => {
  const [budget, setBudget] = useState<number>(250000);
  const [fromLoc, setFromLoc] = useState(location);
  const [toLoc, setToLoc] = useState(initialSearch);
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  const fromTimeout = useRef<any>(null);
  const toTimeout = useRef<any>(null);

  useEffect(() => {
    if (fromLoc.length > 2) {
      clearTimeout(fromTimeout.current);
      fromTimeout.current = setTimeout(async () => {
        const res = await getPlaceSuggestions(fromLoc);
        setFromSuggestions(res);
      }, 500);
    } else setFromSuggestions([]);
  }, [fromLoc]);

  useEffect(() => {
    if (toLoc.length > 2) {
      clearTimeout(toTimeout.current);
      toTimeout.current = setTimeout(async () => {
        const res = await getPlaceSuggestions(toLoc);
        setToSuggestions(res);
      }, 500);
    } else setToSuggestions([]);
  }, [toLoc]);

  const handleGlobalScan = async (destination?: string) => {
    const target = destination || toLoc;
    if (!target.trim()) return;
    setIsScanning(true);
    setFromSuggestions([]);
    setToSuggestions([]);
    try {
      const result = await searchGlobalPlace(fromLoc, target);
      if (result) {
        setSelectedPlace({
          ...result,
          id: `orb-${Date.now()}`,
          imageUrl: `https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80`,
          rating: 4.9
        });
      }
    } catch (e) {
      alert("Recalibrating Orbit Intelligence...");
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = (dest: any) => {
    const ticket: Ticket = {
      id: `ELITE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      userId: user.id,
      destination: dest.name,
      date: new Date().toLocaleDateString(),
      cost: `₹${(dest.comparisons?.[0]?.priceINR || 50000).toLocaleString()}`,
      transportType: dest.routeSummary || 'Orbit Elite Transit',
      status: 'Confirmed'
    };
    onConfirm(ticket);
    setSelectedPlace(null);
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-24 md:pb-0 animate-in fade-in duration-1000">
      {/* Luxury Search Bar */}
      <section className="bg-slate-900 rounded-[2.5rem] md:rounded-[5rem] p-6 md:p-20 text-white relative overflow-hidden border-b-8 border-orange-500 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
        <div className="relative z-10 max-w-5xl">
          <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full mb-8 border border-white/10">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">Orbit VIP Strategy Protocol</span>
          </div>
          
          <h1 className="text-4xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.85]">
            Low Cost. <br/><span className="text-orange-500">High Luxury.</span>
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 bg-white p-2 rounded-[2rem] md:rounded-[3rem] shadow-2xl border-4 border-slate-800">
            <div className="relative flex flex-col px-6 py-4 border-b md:border-b-0 md:border-r border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Starting point</label>
              <input value={fromLoc} onChange={e => setFromLoc(e.target.value)} className="bg-transparent border-none p-0 text-slate-900 font-black text-lg focus:ring-0 w-full" />
              {fromSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl mt-2 z-50 border border-slate-100 overflow-hidden">
                  {fromSuggestions.map(s => (
                    <button key={s} onClick={() => { setFromLoc(s); setFromSuggestions([]); }} className="w-full text-left px-6 py-3 hover:bg-orange-50 text-slate-700 font-bold text-sm transition-colors">{s}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative flex flex-col px-6 py-4 border-b md:border-b-0 md:border-r border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</label>
              <input value={toLoc} onChange={e => setToLoc(e.target.value)} placeholder="Enter luxury goal..." className="bg-transparent border-none p-0 text-slate-900 font-black text-lg focus:ring-0 w-full" />
              {toSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl mt-2 z-50 border border-slate-100 overflow-hidden">
                  {toSuggestions.map(s => (
                    <button key={s} onClick={() => { setToLoc(s); setToSuggestions([]); }} className="w-full text-left px-6 py-3 hover:bg-orange-50 text-slate-700 font-bold text-sm transition-colors">{s}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col px-6 py-4 border-b lg:border-b-0 lg:border-r border-slate-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Investment Limit</label>
              <input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} className="bg-transparent border-none p-0 text-slate-900 font-black text-lg focus:ring-0 w-full" />
            </div>
            <button 
              onClick={() => handleGlobalScan()}
              disabled={isScanning}
              className="bg-orange-500 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 h-14 md:h-full shadow-lg shadow-orange-500/20"
            >
              {isScanning ? 'Syncing...' : 'Scan Routes 🛰'}
            </button>
          </div>
        </div>
      </section>

      {/* Recommended Elite Routes */}
      <section className="px-2">
        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
          <span className="w-1.5 h-8 bg-green-500 rounded-full"></span>
          Curated Elite Getaways
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_DESTINATIONS.slice(0, 3).map(dest => (
            <div key={dest.id} onClick={() => handleGlobalScan(dest.name)} className="bg-white rounded-[3rem] p-4 border border-slate-100 hover:shadow-2xl transition-all group cursor-pointer border-b-4 hover:border-orange-500">
              <div className="h-64 rounded-[2.5rem] overflow-hidden mb-6 relative">
                <img src={dest.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-black">★ {dest.rating}</div>
              </div>
              <div className="px-4 pb-2">
                <p className="text-orange-500 text-[9px] font-black uppercase mb-1 tracking-widest">{dest.category}</p>
                <h3 className="text-2xl font-black text-slate-900">{dest.name}</h3>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Orbit Estimated</span>
                  <span className="text-green-600 font-black text-xl">₹{(dest.estimatedBaseCostUSD * 83).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Elite Detail Modal */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-3xl z-[100] flex items-center justify-center p-2 md:p-6 overflow-hidden">
          <div className="bg-white rounded-[3rem] md:rounded-[5rem] w-full max-w-7xl h-[95vh] flex flex-col shadow-[0_0_100px_rgba(249,115,22,0.2)] animate-in zoom-in-95 duration-500 relative">
            <button onClick={() => setSelectedPlace(null)} className="absolute top-8 right-8 w-14 h-14 bg-black/10 backdrop-blur rounded-[1.5rem] flex items-center justify-center text-slate-900 hover:bg-orange-500 hover:text-white transition-all z-50 font-bold">✕</button>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              <div className="h-80 relative overflow-hidden flex-shrink-0">
                <img src={selectedPlace.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                <div className="absolute bottom-10 left-10 md:left-24">
                  <p className="text-orange-500 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Exclusive Insight</p>
                  <h2 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none">{selectedPlace.name}</h2>
                </div>
              </div>

              <div className="p-8 md:p-24 pt-10 space-y-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                  <div className="lg:col-span-2 space-y-12">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest">Orbit Route Sync</span>
                        <span className="text-slate-400 text-sm font-bold">Origin: {fromLoc}</span>
                      </div>
                      <p className="text-slate-600 text-xl md:text-3xl leading-relaxed font-medium tracking-tight italic">"{selectedPlace.description}"</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                       {[
                         { icon: '✈️', mode: 'Flight', cost: selectedPlace.costs?.flight },
                         { icon: '🚆', mode: 'Train', cost: selectedPlace.costs?.train },
                         { icon: '🚌', mode: 'Bus', cost: selectedPlace.costs?.bus },
                         { icon: '🚗', mode: 'Car', cost: selectedPlace.costs?.car },
                         { icon: '🚲', mode: 'Bike', cost: selectedPlace.costs?.bike },
                       ].map(item => (
                         <div key={item.mode} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center hover:bg-white hover:shadow-xl transition-all cursor-default">
                           <span className="text-2xl block mb-2">{item.icon}</span>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.mode}</p>
                           <p className="font-black text-slate-900">₹{(item.cost || 0).toLocaleString()}</p>
                         </div>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-orange-50 p-10 rounded-[4rem] border border-orange-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-8 flex items-center gap-2"><span>💎</span> Budget Luxury Hacks</h4>
                        <div className="space-y-4">
                           {selectedPlace.luxuryTips?.map((t: string, i: number) => (
                             <p key={i} className="text-sm font-bold text-slate-700 flex gap-4 leading-relaxed"><span className="text-orange-500">•</span> {t}</p>
                           ))}
                        </div>
                      </div>
                      <div className="bg-green-50 p-10 rounded-[4rem] border border-green-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-green-600 mb-8 flex items-center gap-2"><span>🛡️</span> Risk-Free Protocol</h4>
                        <div className="space-y-4">
                           {selectedPlace.laws?.map((l: string, i: number) => (
                             <p key={i} className="text-sm font-bold text-slate-700 flex gap-4 leading-relaxed"><span className="text-green-500">•</span> {l}</p>
                           ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Comp */}
                  <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[4rem] p-10 text-white shadow-3xl relative overflow-hidden border-b-8 border-green-500">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-10">Orbit Price Arbiter</h4>
                      <div className="space-y-8 mb-12">
                        {selectedPlace.comparisons?.map((c: any) => (
                          <div key={c.site} className="flex justify-between items-center group">
                            <span className={`font-black text-lg ${c.site === 'Orbit Elite' ? 'text-orange-500' : 'text-slate-400'}`}>{c.site}</span>
                            <span className={`font-black text-xl ${c.site === 'Orbit Elite' ? 'text-white' : 'text-slate-500'}`}>₹{c.priceINR.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-10 border-t border-white/10">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">Your Orbit Exclusive Rate</p>
                        <p className="text-6xl font-black text-center mb-10 tracking-tighter">₹{(selectedPlace.comparisons?.[0]?.priceINR || 0).toLocaleString()}</p>
                        <button 
                          onClick={() => handleConfirm(selectedPlace)}
                          className="w-full py-6 bg-white text-slate-900 font-black rounded-[2rem] uppercase text-xs tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-2xl active:scale-95"
                        >Confirm VIP Reservation</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Dashboard;
