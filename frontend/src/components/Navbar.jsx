import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanFace } from 'lucide-react';

const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <ScanFace className="w-8 h-8 text-purple-400 group-hover:text-cyan-400 transition-colors" />
            </motion.div>
            <span className="font-bold text-xl tracking-tight gradient-text">
              SmartAttend
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Log in
            </Link>
            <Link to="/signup" className="btn-primary text-sm">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
