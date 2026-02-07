
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const storedUsers = JSON.parse(localStorage.getItem('orbit_registered_users') || '[]');

    if (isLogin) {
      // Admin bypass
      if (username.toLowerCase() === 'admin' && password === 'admin') {
        onLogin({ id: 'admin-1', username: 'Administrator', role: UserRole.ADMIN, currency: 'INR' });
        return;
      }

      const found = storedUsers.find((u: any) => u.username === username && u.password === password);
      if (found) {
        onLogin({ ...found, role: UserRole.USER });
      } else {
        setError("Invalid credentials. Please register first.");
      }
    } else {
      // Registration
      if (storedUsers.some((u: any) => u.username === username)) {
        setError("Username already exists.");
        return;
      }
      const newUser = { id: Date.now().toString(), username, password, currency: 'INR' };
      localStorage.setItem('orbit_registered_users', JSON.stringify([...storedUsers, newUser]));
      alert("Registration successful! You can now login.");
      setIsLogin(true);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden font-['Inter']">
      {/* Decorative Circles */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white border border-slate-100 p-8 md:p-12 rounded-[2rem] shadow-2xl shadow-orange-200/20">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-orange-500/30 mb-6">O</div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Orbit</h1>
            <p className="text-slate-500 font-medium">Global Travel. Simplified.</p>
          </div>

          <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
            <button 
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Login
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Create Account
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100 text-center">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-400 mb-2 ml-1 tracking-widest">Username</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="Ex: travel_pro"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-400 mb-2 ml-1 tracking-widest">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit"
              className={`w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all mt-6 active:scale-[0.98] ${isLogin ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}`}
            >
              {isLogin ? 'Enter Orbit' : 'Join the Community'}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              Secured with Orbit-AI Cloud
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
