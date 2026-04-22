import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, LogOut, ChevronRight, User as UserIcon, Camera } from 'lucide-react';

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/students', label: 'Students Directory', icon: Users },
        { path: '/attendance', label: 'Attendance Logs', icon: CalendarCheck },
        { path: '/camera', label: 'Camera Lab', icon: Camera },
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex text-slate-200">

            {/* Sidebar Navigation */}
            <aside className="w-72 hidden md:flex flex-col bg-slate-900/50 border-r border-slate-800 backdrop-blur-xl shrink-0 transition-all duration-300">
                <div className="p-6 h-20 flex items-center border-b border-slate-800/50">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center mr-3 shadow-lg shadow-cyan-500/20">
                        <span className="text-white font-bold text-lg leading-none">S</span>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-500">
                        SmartAttend
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-8">
                    <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Operations</p>
                    <nav className="space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-cyan-500/10 text-cyan-400 font-medium'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                                        <span>{item.label}</span>
                                    </div>
                                    {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden w-full relative">

                {/* Top Header Navbar */}
                <header className="h-20 bg-slate-900/30 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-10">
                    <h2 className="text-lg font-medium text-slate-300 capitalize hidden sm:block">
                        {location.pathname.replace('/', '') || 'Overview'}
                    </h2>

                    <div className="flex items-center gap-6 ml-auto">
                        <div className="flex items-center gap-3 bg-slate-800/40 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-sm">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-200 leading-none mb-1">System Admin</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">Super User</span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="group flex items-center gap-2 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        >
                            <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-sm font-medium hidden sm:block">Logout</span>
                        </button>
                    </div>
                </header>

                {/* Dynamic Page Outlets */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950 p-6 sm:p-10 hide-scrollbar">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>

        </div>
    );
};

export default AdminLayout;
