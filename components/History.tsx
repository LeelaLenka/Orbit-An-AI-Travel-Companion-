
import React, { useState } from 'react';
import { TravelHistory } from '../types';

interface HistoryProps {
  history: TravelHistory[];
  setHistory: React.Dispatch<React.SetStateAction<TravelHistory[]>>;
  onFindDestination: () => void;
}

const History: React.FC<HistoryProps> = ({ history, setHistory, onFindDestination }) => {
  const [feedbackInput, setFeedbackInput] = useState<{ [key: string]: string }>({});

  const submitFeedback = (id: string) => {
    const updatedHistory = history.map(item => {
      if (item.id === id) {
        return { ...item, feedback: feedbackInput[id] };
      }
      return item;
    });
    setHistory(updatedHistory);
    localStorage.setItem('orbit_history', JSON.stringify(updatedHistory));
    alert("Feedback received! Orbit hopes you had a safe journey.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-10 rounded-[3rem] border border-orange-50 shadow-xl gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Your Travel Log</h2>
          <p className="text-slate-500 font-medium text-lg">Every adventure is a step closer to global discovery.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-green-100 text-green-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-green-200 shadow-sm">
            {history.length} Tickets Issued
          </div>
          <button 
            onClick={onFindDestination}
            className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all"
          >
            New Trip +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 pb-20">
        {history.length === 0 ? (
          <div className="bg-white p-24 rounded-[4rem] text-center border-4 border-dashed border-orange-100">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">✈️</div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No tickets raised yet</h3>
            <p className="text-slate-400 font-bold mb-10 max-w-sm mx-auto">Ready to explore the globe with Orbit AI? Find your first destination now.</p>
            <button 
              onClick={onFindDestination}
              className="px-12 py-5 bg-green-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-green-600/30 hover:bg-green-700 transition-all active:scale-95"
            >
              Start Your Orbit Scan
            </button>
          </div>
        ) : (
          history.slice().reverse().map((trip) => (
            <div key={trip.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/10 flex flex-col md:flex-row overflow-hidden group hover:-translate-y-1 transition-all">
              {/* Ticket Left Section */}
              <div className="bg-slate-900 text-white p-10 md:w-96 flex flex-col justify-between border-r-2 border-dashed border-slate-700 relative">
                 <div className="absolute top-0 -left-6 w-12 h-12 bg-slate-50 rounded-full"></div>
                 <div className="absolute bottom-0 -left-6 w-12 h-12 bg-slate-50 rounded-full"></div>
                 <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-white rounded-full"></div>
                 
                 <div>
                   <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-2">Verified Orbit Ticket</p>
                   <h3 className="text-3xl font-black tracking-tight leading-tight">{trip.destination.toUpperCase()}</h3>
                   <p className="text-[10px] text-slate-500 mt-3 font-black tracking-widest">UID: {trip.id}</p>
                 </div>
                 
                 <div className="mt-10 space-y-6">
                   <div className="flex justify-between border-b border-white/10 pb-4">
                     <div>
                       <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Status</p>
                       <p className="text-green-500 font-black text-sm uppercase flex items-center gap-2">
                         <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> {trip.status}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Issued</p>
                       <p className="text-white font-black text-sm">{trip.date}</p>
                     </div>
                   </div>
                   <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Transport Authority</p>
                      <p className="text-xs font-bold text-orange-200">{trip.transportType}</p>
                   </div>
                 </div>
              </div>

              {/* Ticket Body */}
              <div className="p-10 flex-grow flex flex-col justify-between">
                <div className="flex justify-between items-start mb-10">
                   <div>
                     <p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">Logistics Breakdown</p>
                     <div className="flex gap-4">
                        <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase">Confirmed Route</div>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase">Risk Cleared</div>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">Total Valuation</p>
                     <p className="text-3xl font-black text-orange-600 leading-none">{trip.cost}</p>
                   </div>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 relative group-hover:border-orange-200 transition-all">
                  {trip.feedback ? (
                    <div className="space-y-3">
                       <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Travel Experience Journal</p>
                       <p className="italic text-slate-600 text-lg font-medium leading-relaxed">"{trip.feedback}"</p>
                       <div className="flex gap-1 text-orange-400">★★★★★</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Share Your Experience</label>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          placeholder="How was the journey? Healthy food spots? Local law tips?"
                          className="flex-grow bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                          onChange={(e) => setFeedbackInput(prev => ({ ...prev, [trip.id]: e.target.value }))}
                        />
                        <button 
                          onClick={() => submitFeedback(trip.id)}
                          className="px-8 py-4 bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-700 shadow-xl shadow-green-600/20 active:scale-95 transition-all"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
