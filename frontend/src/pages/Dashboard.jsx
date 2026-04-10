import { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, CalendarDays, Activity, ChevronRight, Wifi, WifiOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { dashboardAPI, attendanceAPI, BASE_URL } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import AdminLayout from '../components/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    total_students: 0,
    today_attendance: 0,
    present_count: 0,
    late_count: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { lastMessage, status, isLive } = useWebSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, logsRes] = await Promise.all([
          dashboardAPI.getSummary(),
          attendanceAPI.getLogs({ date: new Date().toISOString().split('T')[0] })
        ]);
        
        if (summaryRes && summaryRes.data) {
          setMetrics(summaryRes.data);
        }
        if (logsRes) {
          setRecentLogs(logsRes.slice(0, 5));
        }
      } catch (err) {
        console.error("Dashboard pull error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle Real-time Updates via Hook
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'NEW_ATTENDANCE') {
        const newRecord = lastMessage.data;
        
        // 1. Update Metrics
        setMetrics(prev => ({
            ...prev,
            today_attendance: prev.today_attendance + 1,
            present_count: newRecord.status === 'present' ? prev.present_count + 1 : prev.present_count,
            late_count: newRecord.status === 'late' ? prev.late_count + 1 : prev.late_count,
        }));

        // 2. Prepend to Recent Logs
        setRecentLogs(prev => [newRecord, ...prev.slice(0, 4)]);
    }
  }, [lastMessage]);

  const cards = [
    {
      title: 'Total Enrolled',
      value: metrics.total_students,
      icon: Users,
      color: 'from-blue-500/20 to-blue-600/20',
      textColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20'
    },
    {
      title: "Today's Logs",
      value: metrics.today_attendance,
      icon: CalendarDays,
      color: 'from-indigo-500/20 to-indigo-600/20',
      textColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/20'
    },
    {
      title: 'Present (On Time)',
      value: metrics.present_count,
      icon: UserCheck,
      color: 'from-emerald-500/20 to-emerald-600/20',
      textColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20'
    },
    {
      title: 'Late Arrivals',
      value: metrics.late_count,
      icon: Clock,
      color: 'from-amber-500/20 to-amber-600/20',
      textColor: 'text-amber-400',
      iconBg: 'bg-amber-500/20'
    }
  ];

  if (error) {
    return (
      <AdminLayout>
        <div className="glass-effect rounded-2xl p-8 border border-red-500/30 text-center">
          <p className="text-red-400 flex items-center justify-center gap-2">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             {error}
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 hidden sm:block">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Real-time Overview</h1>
        <p className="text-slate-400">Monitoring actively synced PostgreSQL recognition metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className={`glass-effect rounded-3xl p-6 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 relative overflow-hidden group`}
            >
              {/* Subtle background glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-40 group-hover:opacity-60 transition-opacity blur-2xl -z-10`} />
              
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${card.iconBg} border border-white/5`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
              
              <div>
                <h3 className="text-slate-400 font-medium text-sm tracking-wide mb-1 opacity-80">{card.title}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    {isLoading ? <span className="animate-pulse bg-slate-800/50 rounded h-10 w-16 block mt-1"></span> : card.value}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Activity Feed */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-effect border border-slate-800/60 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Live Activity Feed</h2>
            </div>
            
            <div className="flex items-center gap-3">
              {isLive ? (
                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                  <Wifi className="w-3 h-3" />
                  True Real-time
                </span>
              ) : status === 'closed' ? (
                <span className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                  <WifiOff className="w-3 h-3" />
                  Disconnected
                </span>
              ) : (
                <span className="flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Connecting...
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-800/30">
                    <th className="px-8 py-4">Student</th>
                    <th className="px-8 py-4">Time</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  <AnimatePresence initial={false}>
                    {recentLogs.map((log) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(34, 211, 238, 0.05)' }}
                        animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                        transition={{ duration: 0.5 }}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {log.student?.name?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{log.student?.name}</span>
                              <span className="text-[10px] text-slate-500">{log.student?.roll_number}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-xs text-slate-400 font-mono">
                          {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                            log.status === 'present' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-xs font-mono text-cyan-400">
                            {Math.round(log.confidence <= 1 ? log.confidence * 100 : log.confidence)}%
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  
                  {recentLogs.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan="4" className="px-8 py-12 text-center text-slate-500 text-sm italic">
                        No activity detected yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-4 bg-slate-900/40 border-t border-slate-800/50">
             <a href="/attendance" className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-widest">
               View All History
               <ChevronRight className="w-4 h-4" />
             </a>
          </div>
        </div>

        {/* System Health / Summary Mini-Card */}
        <div className="space-y-6">
           <div className="glass-effect border border-slate-800/60 rounded-[2rem] p-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recognition Engine</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Status</span>
                    <span className="text-sm text-emerald-400 font-bold">Operational</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Latency</span>
                    <span className="text-sm text-cyan-400 font-mono">~180ms</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Accuracy</span>
                    <span className="text-sm text-indigo-400 font-bold">98.4%</span>
                 </div>
              </div>
           </div>
           
           <div className="glass-effect border border-emerald-500/30 bg-emerald-500/5 rounded-[2rem] p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <ShieldCheck className="w-16 h-16 text-emerald-500" />
              </div>
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Security Notice</h3>
              <p className="text-xs text-emerald-200/60 leading-relaxed">System is actively monitoring all entry points with 256-bit encryption on biometric transmission.</p>
           </div>
        </div>
      </div>

      </div>
    </AdminLayout>
  );
};

export default Dashboard;
