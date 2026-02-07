
import React, { useState, useRef, useEffect } from 'react';
import { User, Ticket } from '../types';
import { orbitAgentChat, translateAndSpeak, playBase64Audio } from '../services/geminiService';

interface OrbitAgentProps {
  user: User;
  location: string;
  onConfirm: (ticket: Ticket) => void;
}

const OrbitAgent: React.FC<OrbitAgentProps> = ({ user, location }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'agent', text: string, isTranslation?: boolean }[]>([
    { role: 'agent', text: `# Orbit Global Intelligence Initialized\n\nHello **${user.username}**, I am your unified travel logic. I have access to data for every city, town, and landmark across the globe.\n\n**Current Scan Point:** ${location}\n\n**I can assist you with:**\n*   **Deep Research:** Facts and local laws for *any* small town or city.\n*   **Safe Dining:** Healthy local hotspots.\n*   **Emergency Logic:** Crisis numbers for your specific destination.\n*   **Global Voice:** Real-time translation to any regional dialect.\n\nWhich destination shall we scan today?` }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [targetLang, setTargetLang] = useState("Russian");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await orbitAgentChat(userMsg, { username: user.username, currency: 'INR', location });
      setMessages(prev => [...prev, { role: 'agent', text: response || "Orbit link timeout. Please restate." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'agent', text: "### Connection Fault\nOrbit neural core is experiencing latency. Ensure your API environment is stable." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceTranslate = async () => {
    if (!input.trim()) return;
    setIsTyping(true);
    try {
      const result = await translateAndSpeak(input, targetLang);
      if (result.audio) {
        await playBase64Audio(result.audio);
        setMessages(prev => [...prev, { 
          role: 'agent', 
          isTranslation: true,
          text: `### Voice Assistant: Global Translator\n\n**Input Query:** "${input}"\n**Region Dialect:** ${targetLang}\n**Translation Output:** "${result.text}"\n\n*Audio synthesized and broadcasted via Orbit Core.*` 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'agent', text: "**Audio Link Failure**: Check browser microphone and output permissions." }]);
    } finally {
      setIsTyping(false);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-[4rem] shadow-3xl border border-orange-100 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* High-Tech Header */}
      <div className="bg-slate-900 p-8 text-white flex items-center justify-between border-b-4 border-green-500">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center font-black text-3xl shadow-2xl shadow-orange-500/20">O</div>
          <div>
            <h3 className="font-black text-2xl tracking-tighter">Orbit AI Agent</h3>
            <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span> Global Neural Sync Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Language</span>
            <input 
              className="bg-slate-800 text-xs font-black rounded-xl px-4 py-2.5 text-orange-400 w-44 outline-none border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              placeholder="Ex: Russian, Telugu, French..."
            />
          </div>
          <button 
            onClick={() => setVoiceMode(!voiceMode)}
            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl ${voiceMode ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            title="Toggle Voice Assistant"
          >
            <span className="text-3xl">{voiceMode ? '🛑' : '🎙'}</span>
          </button>
        </div>
      </div>

      {/* Structured Messages Display */}
      <div className="flex-grow p-12 overflow-y-auto space-y-12 bg-slate-50/20 scroll-smooth custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-12 py-10 rounded-[3rem] shadow-xl transition-all ${
              m.role === 'user' 
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-none font-bold' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none leading-relaxed'
            }`}>
              <div className={`whitespace-pre-wrap text-base md:text-lg prose prose-slate max-w-none ${m.role === 'agent' ? 'orbit-markdown' : ''}`}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-10 py-6 rounded-[2.5rem] rounded-tl-none flex items-center gap-4 shadow-xl border border-slate-100">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Control Center */}
      <div className="p-10 bg-white border-t border-slate-100">
        <div className="flex gap-6 max-w-5xl mx-auto">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (voiceMode ? handleVoiceTranslate() : handleSend())}
            placeholder={voiceMode ? `Say something to convert to ${targetLang}...` : "Ask Orbit about any city, laws, or costs..."}
            className="flex-grow px-10 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] focus:ring-8 focus:ring-orange-500/5 focus:border-orange-500 transition-all font-black text-lg outline-none"
          />
          <button 
            onClick={voiceMode ? handleVoiceTranslate : handleSend}
            className={`px-16 py-6 text-white font-black rounded-[2.5rem] transition-all shadow-3xl active:scale-95 text-lg uppercase tracking-widest ${voiceMode ? 'bg-red-500 shadow-red-500/30' : 'bg-green-600 shadow-green-600/30'}`}
          >
            {voiceMode ? 'Voice Mode' : 'Analyze'}
          </button>
        </div>
        <div className="flex justify-between items-center mt-8 px-8 opacity-50">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Orbit Agent v3.1 | Universal Knowledge Matrix
          </p>
          <div className="flex gap-6">
             <span className="text-[10px] font-black uppercase tracking-widest">Latency: 45ms</span>
             <span className="text-[10px] font-black uppercase tracking-widest">Health: Stable</span>
          </div>
        </div>
      </div>

      <style>{`
        .orbit-markdown h1 { font-size: 2.2rem; font-weight: 900; color: #0f172a; margin-bottom: 1.5rem; letter-spacing: -0.05em; border-left: 8px solid #f97316; padding-left: 1rem; }
        .orbit-markdown h2 { font-size: 1.6rem; font-weight: 900; color: #166534; margin-top: 2rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.1em; }
        .orbit-markdown h3 { font-size: 1.3rem; font-weight: 800; color: #ea580c; margin-top: 1.5rem; }
        .orbit-markdown ul { list-style: none; padding-left: 0; margin-bottom: 1.5rem; }
        .orbit-markdown li { margin-bottom: 0.8rem; padding-left: 1.5rem; position: relative; font-weight: 500; }
        .orbit-markdown li::before { content: "→"; position: absolute; left: 0; color: #16a34a; font-weight: 900; }
        .orbit-markdown strong { color: #ea580c; font-weight: 900; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e2e8f0; }
      `}</style>
    </div>
  );
};

export default OrbitAgent;
