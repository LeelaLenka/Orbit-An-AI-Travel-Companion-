
import React from 'react';
import { MOCK_DESTINATIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard: React.FC = () => {
  const data = MOCK_DESTINATIONS.map(d => ({
    name: d.name,
    cost: d.estimatedBaseCostUSD,
    rating: d.rating
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-2">Total Users</p>
          <h3 className="text-3xl font-bold text-slate-800">1,284</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-2">Active Trips</p>
          <h3 className="text-3xl font-bold text-indigo-600">45</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase mb-2">Platform Revenue</p>
          <h3 className="text-3xl font-bold text-green-600">₹4.2L</h3>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Destination Price Comparison (USD)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="cost" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Platform Destinations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase">Destination</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase">Country</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase">Price (USD)</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase">Rating</th>
                <th className="pb-4 font-bold text-slate-500 text-xs uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_DESTINATIONS.map(d => (
                <tr key={d.id}>
                  <td className="py-4 text-sm font-semibold text-slate-800">{d.name}</td>
                  <td className="py-4 text-sm text-slate-600">{d.country}</td>
                  <td className="py-4 text-sm text-slate-600">${d.estimatedBaseCostUSD}</td>
                  <td className="py-4 text-sm text-slate-600">★ {d.rating}</td>
                  <td className="py-4 text-sm text-right">
                    <button className="text-indigo-600 font-bold hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
