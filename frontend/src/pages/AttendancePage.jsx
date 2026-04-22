import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    User,
    Search,
    RefreshCcw,
    CheckCircle,
    Clock,
    Building2,
    GraduationCap
} from 'lucide-react';
import { attendanceAPI, studentsAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import AdminLayout from '../components/AdminLayout';

const DEPARTMENTS = [
    'Computer Science',
    'Software Engineering',
    'Mathematics',
    'English',
    'Physics',
    'Biology',
    'Physical Education'
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const AttendancePage = () => {
    const [logs, setLogs] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        student_id: '',
        department: '',
        semester: ''
    });
    const [error, setError] = useState('');

    const { lastMessage } = useWebSocket();

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filters.date, filters.department, filters.semester, filters.student_id]);

    // Handle Real-time Updates via WebSocket
    useEffect(() => {
        if (lastMessage && lastMessage.type === 'NEW_ATTENDANCE') {
            const newRecord = lastMessage.data;
            const today = new Date().toISOString().split('T')[0];

            setLogs(prevLogs => {
                if (prevLogs.find(log => log.id === newRecord.id)) return prevLogs;

                // Check if it matches current filters
                if (filters.date === today) {
                    // If filtering by student, check student match
                    if (filters.student_id && parseInt(filters.student_id) !== newRecord.student_id) return prevLogs;
                    // If filtering by department, check student department
                    if (filters.department && filters.department !== newRecord.student.department) return prevLogs;
                    // If filtering by semester, check student semester
                    if (filters.semester && parseInt(filters.semester) !== newRecord.student.semester) return prevLogs;

                    return [newRecord, ...prevLogs];
                }
                return prevLogs;
            });
        }
    }, [lastMessage, filters]);

    const fetchData = async (currentFilters = filters) => {
        setIsLoading(true);
        try {
            // Create cleaned filters for API
            const apiFilters = {
                date: currentFilters.date || undefined,
                student_id: currentFilters.student_id || undefined,
                department: currentFilters.department || undefined,
                semester: currentFilters.semester || undefined
            };
            const data = await attendanceAPI.getLogs(apiFilters);
            setLogs(data);
        } catch (err) {
            console.error("Log fetch error:", err);
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
        setFilters(prev => ({ ...prev, [name]: value }));
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
                        <p className="text-slate-400">Review system activity by Date, Department, and Semester.</p>
                    </div>
                    <button
                        onClick={() => fetchData()}
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg active:scale-95"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh Logs
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-cyan-400">
                            <Calendar className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                            type="date"
                            name="date"
                            value={filters.date}
                            onChange={handleFilterChange}
                            className="block w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all backdrop-blur-sm"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-cyan-400">
                            <Building2 className="h-5 w-5 text-slate-500" />
                        </div>
                        <select
                            name="department"
                            value={filters.department}
                            onChange={handleFilterChange}
                            className="block w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all backdrop-blur-sm appearance-none cursor-pointer"
                        >
                            <option value="">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-cyan-400">
                            <GraduationCap className="h-5 w-5 text-slate-500" />
                        </div>
                        <select
                            name="semester"
                            value={filters.semester}
                            onChange={handleFilterChange}
                            className="block w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all backdrop-blur-sm appearance-none cursor-pointer"
                        >
                            <option value="">All Semesters</option>
                            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-cyan-400">
                            <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <select
                            name="student_id"
                            value={filters.student_id}
                            onChange={handleFilterChange}
                            className="block w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all backdrop-blur-sm appearance-none"
                        >
                            <option value="">Specific Student</option>
                            {students.map(student => (
                                <option key={student.id} value={student.id}>{student.name}</option>
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
                                <tr className="bg-slate-800/50 border-b border-slate-700/50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-5">Student</th>
                                    <th className="px-6 py-5">Academic Info</th>
                                    <th className="px-6 py-5">Log Time</th>
                                    <th className="px-6 py-5 text-center">Status</th>
                                    <th className="px-6 py-5 text-right">Match</th>
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
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700 font-bold shrink-0">
                                                        {log.student?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-200">{log.student?.name || 'Unknown'}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono italic">{log.student?.roll_number}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs text-slate-300 font-medium">{log.student?.department}</span>
                                                    <span className="text-[10px] text-slate-500">Semester {log.student?.semester} (Sec {log.student?.section})</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-slate-300 text-xs font-mono">
                                                    <div className="text-[10px] text-slate-500 mb-0.5 uppercase">{formatDate(log.date)}</div>
                                                    {formatTime(log.time)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${log.status === 'present'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono text-xs text-cyan-400">
                                                {Math.round(log.confidence <= 1 ? log.confidence * 100 : log.confidence)}%
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <Search className="w-10 h-10" />
                                                <p className="text-sm font-medium">No logs found matching selection.</p>
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
