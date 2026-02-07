
import React, { useState, useEffect } from 'react';
import { User, UserRole, TravelHistory, Ticket } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import OrbitAgent from './components/OrbitAgent';
import AdminDashboard from './components/AdminDashboard';
import History from './components/History';
import Profile from './components/Profile';
import LocationVR from './components/LocationVR';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'agent' | 'history' | 'vr' | 'profile' | 'admin'>('explore');
  const [history, setHistory] = useState<TravelHistory[]>([]);
  const [location, setLocation] = useState<string>("Mumbai, India");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation(`Lat: ${position.coords.latitude.toFixed(2)}, Lon: ${position.coords.longitude.toFixed(2)}`);
      }, (err) => {
        console.log("Geolocation error", err);
      });
    }

    const savedUser = sessionStorage.getItem('orbit_active_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedHistory = localStorage.getItem('orbit_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    sessionStorage.setItem('orbit_active_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('orbit_active_user');
    setActiveTab('explore');
  };

  const raiseTicket = (ticket: Ticket) => {
    const newItem: TravelHistory = { ...ticket };
    const newHistory = [...history, newItem];
    setHistory(newHistory);
    localStorage.setItem('orbit_history', JSON.stringify(newHistory));
    setActiveTab('history');
  };

  const navigateToExplore = () => {
    setActiveTab('explore');
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-orange-50/10 overflow-hidden font-['Inter']">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        isAdmin={user.role === UserRole.ADMIN} 
      />
      
      <main className="flex-grow overflow-y-auto p-4 md:p-12 scroll-smooth">
        <div className="max-w-7xl mx-auto w-full">
          {activeTab === 'explore' && <Dashboard user={user} location={location} onConfirm={raiseTicket} />}
          {activeTab === 'agent' && <OrbitAgent user={user} location={location} onConfirm={raiseTicket} />}
          {activeTab === 'history' && <History history={history} setHistory={setHistory} onFindDestination={navigateToExplore} />}
          {activeTab === 'vr' && <LocationVR />}
          {activeTab === 'profile' && <Profile user={user} />}
          {activeTab === 'admin' && user.role === UserRole.ADMIN && <AdminDashboard />}
        </div>
      </main>
    </div>
  );
};

export default App;
