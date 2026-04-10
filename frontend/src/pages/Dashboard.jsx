import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Percent, 
  Activity, 
  Clock, 
  TrendingUp, 
  PieChart as PieIcon,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend 
} from 'recharts';
import { dashboardAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardAPI.getSummary();
      setData(response);
    } catch (err) {
      console.error("Dashboard data fetch failed:", err);
      setError("Failed to load dashboard statistics.");
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Aggregating real-time analytics...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8 glass-effect border border-red-500/30 rounded-3xl text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchStats}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
            >
              Retry Load
            </button>
        </div>
      </AdminLayout>
    );
  }

  const { stats, recent_activity, weekly_trend, distribution } = data;

  const cards = [
    { title: 'Total Registered', value: stats.total_students, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Present Today', value: stats.present_today, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Absent Today', value: stats.absent_today, icon: UserPlus, color: 'text-red-400', bg: 'bg-red-500/10' },
    { title: 'Attendance %', value: stats.attendance_percentage, icon: Percent, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <AdminLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">System Analytics</h1>
            <p className="text-slate-400">Holistic view of participation and engagement metrics.</p>
          </div>
          <button 
            onClick={fetchStats}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all border border-slate-700"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-effect p-6 rounded-[2rem] border border-slate-800/80 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${card.bg} border border-white/5`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{card.title}</p>
                  <h3 className="text-3xl font-bold text-white">{card.value}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weekly Bar Chart */}
          <div className="lg:col-span-2 glass-effect p-8 rounded-[2.5rem] border border-slate-800/60">
            <div className="flex items-center gap-3 mb-8">
               <TrendingUp className="w-5 h-5 text-cyan-400" />
               <h2 className="text-xl font-bold text-white">Weekly Participation</h2>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6" 
                    radius={[6, 6, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Today's Distribution Pie Chart */}
          <div className="glass-effect p-8 rounded-[2.5rem] border border-slate-800/60">
            <div className="flex items-center gap-3 mb-8">
               <PieIcon className="w-5 h-5 text-amber-400" />
               <h2 className="text-xl font-bold text-white">Daily Split</h2>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
               {distribution.map((d, i) => (
                 <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">{d.name}</span>
                    <span className="text-white font-bold">{d.value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="glass-effect rounded-[2.5rem] border border-slate-800/60 overflow-hidden">
          <div className="p-8 border-b border-slate-800/40 flex items-center gap-3">
             <Activity className="w-5 h-5 text-indigo-400" />
             <h2 className="text-xl font-bold text-white">Recent Activity Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-8 py-4">Student Name</th>
                  <th className="px-8 py-4 text-center">Time</th>
                  <th className="px-8 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {recent_activity.map((log, i) => (
                  <tr key={i} className="group hover:bg-white/5 transition-all">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 border border-slate-700">
                             {log.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-200 group-hover:text-white">{log.name}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-center text-xs font-mono text-slate-400">
                      {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-5 text-right">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                         log.status === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
                         log.status === 'late' ? 'bg-amber-500/10 text-amber-400' :
                         'bg-red-500/10 text-red-400'
                       }`}>
                         {log.status}
                       </span>
                    </td>
                  </tr>
                ))}
                {recent_activity.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-8 py-12 text-center text-slate-500 italic">
                      Waiting for incoming recognition logs...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
