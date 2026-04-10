import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Search, RefreshCcw, CheckCircle, Clock } from 'lucide-react';
import { attendanceAPI, studentsAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import AdminLayout from '../components/AdminLayout';

const AttendancePage = () => {
  const [logs, setLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    student_id: ''
  });
  const [error, setError] = useState('');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    fetchData();
    fetchStudents();
  }, [filters.date]); // Re-fetch only when date changed

  // Handle Real-time Updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'NEW_ATTENDANCE') {
        const newRecord = lastMessage.data;
        const today = new Date().toISOString().split('T')[0];
        
        setLogs(prevLogs => {
            // Prevent duplicates
            if (prevLogs.find(log => log.id === newRecord.id)) return prevLogs;
            
            // Only prepend if it matches current date filter (usually today)
            if (filters.date === today) {
                return [newRecord, ...prevLogs];
            }
            return prevLogs;
        });
    }
  }, [lastMessage, filters.date]);

  const fetchData = async (currentFilters = filters) => {
    setIsLoading(true);
    try {
      const data = await attendanceAPI.getLogs(currentFilters);
      setLogs(data);
    } catch (err) {
      setError('Failed to load attendance logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await studentsAPI.getAll();
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students for filter.");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Attendance Logs</h1>
            <p className="text-slate-400">Review real-time recognition history and arrival statuses.</p>
          </div>
          <button 
            onClick={() => fetchData()}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-cyan-400 transition-colors">
              <Calendar className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="block w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all backdrop-blur-sm"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-cyan-400 transition-colors">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <select
              name="student_id"
              value={filters.student_id}
              onChange={handleFilterChange}
              className="block w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all backdrop-blur-sm appearance-none"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>{student.name} ({student.roll_number})</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="glass-effect rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700/50">
                  <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider">Student & Role</th>
                  <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider">Log Date</th>
                  <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider">Arrival Time</th>
                  <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-6 py-4 bg-slate-900/20 h-16"></td>
                    </tr>
                  ))
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 shrink-0">
                            <span className="text-xs font-bold uppercase">{log.student?.name?.charAt(0) || 'U'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200">{log.student?.name || 'Unknown Subject'}</span>
                            <span className="text-xs text-slate-500">{log.student?.roll_number || '---'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-300 text-sm">
                        {formatDate(log.date)}
                      </td>
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
                             <Clock className="w-3.5 h-3.5 text-slate-500" />
                             {formatTime(log.time)}
                          </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                            {log.status === 'present' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle className="w-3 h-3" />
                                    Present
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <Clock className="w-3 h-3" />
                                    Late
                                </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm text-slate-400">
                        {Math.round(log.confidence <= 1 ? log.confidence * 100 : log.confidence)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                           <Search className="w-12 h-12 opacity-20" />
                           <p>No recognition logs found for the selected criteria.</p>
                        </div>
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

export default AttendancePage;
