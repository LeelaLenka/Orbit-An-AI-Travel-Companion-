
import React, { useState } from 'react';

const LocationVR: React.FC = () => {
  const [search, setSearch] = useState("Bali, Indonesia");
  const [mapQuery, setMapQuery] = useState("Bali, Indonesia");
  const [isRotating, setIsRotating] = useState(true);

  const handleLocate = () => {
    if (!search.trim()) return;
    setMapQuery(search);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-24 md:pb-0 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-xl border border-orange-50 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Orbital Imagery</h2>
          <p className="text-slate-500 font-bold text-sm md:text-lg italic leading-none opacity-60">High-Resolution Mapping & Petrol Intel</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto bg-slate-50 p-2 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100">
          <input 
            className="flex-grow md:w-96 bg-transparent px-6 py-4 outline-none font-bold text-base placeholder:text-slate-300"
            placeholder="Scan city or local town..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLocate()}
          />
          <button 
            onClick={handleLocate}
            className="bg-orange-500 text-white px-8 md:px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-slate-900 transition-all active:scale-95"
          >
            LOCATE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* VR Visualization Container */}
        <div className="lg:col-span-7 relative h-[50vh] md:h-[70vh] rounded-[3rem] md:rounded-[5rem] overflow-hidden bg-slate-900 border-8 border-white shadow-2xl group">
          <div 
            className={`absolute inset-0 bg-cover bg-center scale-150 transition-all duration-[60s] ease-linear ${isRotating ? 'animate-[spin_120s_linear_infinite]' : ''}`}
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80')`, backgroundSize: '300% auto' }}
          ></div>
          
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-8 md:p-16">
            <div className="w-20 h-20 md:w-32 md:h-32 border-4 border-white/20 rounded-full mb-8 flex items-center justify-center animate-pulse">
              <span className="text-white font-black text-4xl md:text-5xl tracking-tighter italic">VR</span>
            </div>
            <h3 className="text-white text-4xl md:text-8xl font-black mb-6 uppercase tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">{mapQuery}</h3>
            <p className="text-green-400 font-black text-[10px] md:text-sm uppercase tracking-[0.5em] mb-12 opacity-80">
              ORBITAL SYNC // STREET-VIEW TELEMETRY // ACTIVE
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setIsRotating(!isRotating)}
                className="px-8 py-4 md:px-12 md:py-6 bg-white text-slate-900 font-black rounded-2xl md:rounded-[2.5rem] text-[10px] uppercase tracking-widest shadow-2xl hover:bg-orange-500 hover:text-white transition-all border-b-4 border-slate-200 active:border-b-0"
              >
                {isRotating ? 'PAUSE ORBIT' : 'RESUME SCAN'}
              </button>
              <button className="px-8 py-4 md:px-12 md:py-6 bg-green-600 text-white font-black rounded-2xl md:rounded-[2.5rem] text-[10px] uppercase tracking-widest shadow-2xl hover:bg-green-700 transition-all border-b-4 border-green-800 active:border-b-0">SAVE VISION</button>
            </div>
          </div>
          
          {/* Overlay Stats */}
          <div className="absolute top-10 left-10 hidden md:flex flex-col gap-2">
            <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-xl text-white text-[9px] font-black uppercase tracking-widest border border-white/10">Azimuth: 142.5°</div>
            <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-xl text-white text-[9px] font-black uppercase tracking-widest border border-white/10">Altitude: 350KM</div>
          </div>
        </div>

        {/* Dynamic Map Component */}
        <div className="lg:col-span-5 bg-white rounded-[3rem] md:rounded-[5rem] overflow-hidden shadow-2xl border-8 border-white h-[50vh] md:h-[70vh] flex flex-col">
           <div className="p-6 md:p-10 bg-slate-900 text-white flex justify-between items-center">
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-1">Live Feed</span>
               <span className="text-lg font-black tracking-tight uppercase">Petrol & Supply Intel</span>
             </div>
             <div className="flex gap-3">
               <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
               <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]"></div>
             </div>
           </div>
           <div className="flex-grow relative bg-slate-200">
             <iframe 
               width="100%" 
               height="100%" 
               frameBorder="0" 
               scrolling="no" 
               marginHeight={0} 
               marginWidth={0} 
               title="Orbit Global Map"
               src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery + ' petrol stations')}&hl=en&z=13&output=embed`}
               className="grayscale hover:grayscale-0 transition-all duration-1000 contrast-125 saturate-150"
             ></iframe>
             <div className="absolute inset-0 pointer-events-none border-[15px] md:border-[30px] border-white/10"></div>
           </div>
           <div className="p-6 bg-slate-50 flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Encrypted Connection Valid</span>
             <div className="flex gap-2">
               <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
               <span className="w-1.5 h-1.5 bg-orange-500 rounded-full opacity-50"></span>
               <span className="w-1.5 h-1.5 bg-orange-500 rounded-full opacity-20"></span>
             </div>
           </div>
        </div>
      </div>
      
      {/* Telemetry Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Signal Stream', val: 'ULTRA 8K', color: 'green' },
          { label: 'Orbit Latency', val: '0.04ms', color: 'orange' },
          { label: 'Map Status', val: 'SYNCED', color: 'green' },
          { label: 'Encryption', val: 'AES-256', color: 'orange' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-orange-50 shadow-lg text-center group hover:scale-105 transition-transform">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
             <p className={`text-xl md:text-2xl font-black ${stat.color === 'green' ? 'text-green-600' : 'text-orange-500'}`}>{stat.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationVR;
