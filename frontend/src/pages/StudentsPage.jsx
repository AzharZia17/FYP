import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, GraduationCap, Building2, User } from 'lucide-react';
import { studentsAPI } from '../services/api';
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

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterSem, setFilterSem] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        roll_number: '',
        department: '',
        semester: 1,
        section: 'A'
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStudents();
    }, [filterDept, filterSem]);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            // Pass filters to the API
            const data = await studentsAPI.getAll({
                department: filterDept || undefined,
                semester: filterSem || undefined
            });
            setStudents(data);
        } catch (err) {
            setError('Failed to load students.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (currentStudent) {
                await studentsAPI.update(currentStudent.id, formData);
            } else {
                await studentsAPI.create(formData);
            }
            setIsModalOpen(false);
            fetchStudents();
            setFormData({ name: '', roll_number: '', department: '', semester: 1, section: 'A' });
            setCurrentStudent(null);
        } catch (err) {
            setError(err.message || 'Error processing request');
        }
    };

    const handleEdit = (student) => {
        setCurrentStudent(student);
        setFormData({
            name: student.name,
            roll_number: student.roll_number,
            department: student.department || '',
            semester: student.semester || 1,
            section: student.section || 'A'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this student? All attendance records will be lost.')) {
            try {
                await studentsAPI.delete(id);
                fetchStudents();
            } catch (err) {
                setError('Failed to delete student.');
            }
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Student Directory</h1>
                        <p className="text-slate-400">Manage student profiles by Department and Semester.</p>
                    </div>
                    <button
                        onClick={() => { setCurrentStudent(null); setFormData({ name: '', roll_number: '', department: '', semester: 1, section: 'A' }); setIsModalOpen(true); }}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Student
                    </button>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or roll number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all backdrop-blur-sm"
                        />
                    </div>

                    <div className="flex gap-4">
                        <select
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="bg-slate-900/50 border border-slate-800 text-slate-200 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all cursor-pointer min-w-[180px]"
                        >
                            <option value="">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <select
                            value={filterSem}
                            onChange={(e) => setFilterSem(e.target.value)}
                            className="bg-slate-900/50 border border-slate-800 text-slate-200 px-4 py-3 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all cursor-pointer min-w-[140px]"
                        >
                            <option value="">All Semesters</option>
                            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
                        <X className="w-4 h-4 cursor-pointer" onClick={() => setError('')} />
                        {error}
                    </div>
                )}

                <div className="glass-effect rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700/50">
                                    <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider">Roll Number</th>
                                    <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider">Dept / Sem</th>
                                    <th className="px-6 py-5 text-sm font-semibold text-slate-300 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="4" className="px-6 py-4 bg-slate-900/20 h-16"></td>
                                        </tr>
                                    ))
                                ) : filteredStudents.length > 0 ? (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-200">{student.name}</div>
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Section {student.section || 'A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 focus:outline-none">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                                    {student.roll_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-slate-400">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Building2 className="w-4 h-4 text-cyan-500/50" />
                                                        {student.department || 'General'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                        <GraduationCap className="w-4 h-4" />
                                                        Semester {student.semester || 1}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(student)}
                                                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(student.id)}
                                                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <GraduationCap className="w-12 h-12 opacity-20" />
                                                <p>No students found matching your filters.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="relative w-full max-w-xl glass-effect-heavy rounded-[2.5rem] p-10 border border-slate-700/50 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {currentStudent ? 'Edit Profile' : 'Student Onboarding'}
                                </h2>
                                <p className="text-slate-500 text-sm">Fill in academic and personal details.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                        placeholder="e.g. Alexander Pierce"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Roll / ID Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.roll_number}
                                        onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                        placeholder="e.g. BSE-001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Department</label>
                                    <select
                                        required
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none"
                                    >
                                        <option value="">Select Dept</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Semester</label>
                                    <select
                                        required
                                        value={formData.semester}
                                        onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none"
                                    >
                                        {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Section</label>
                                    <select
                                        required
                                        value={formData.section}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none"
                                    >
                                        <option value="A">Section A</option>
                                        <option value="B">Section B</option>
                                        <option value="C">Section C</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
                                >
                                    {currentStudent ? 'Apply Changes' : 'Complete Registration'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AdminLayout>
    );
};

export default StudentsPage;
