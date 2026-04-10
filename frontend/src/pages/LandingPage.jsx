import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';

const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center">
      <Navbar />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        {/* Hero Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center text-center py-20"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect text-cyan-400 text-sm font-medium mb-8">
            <Zap className="w-5 h-5" />
            <span>The future of attendance tracking is here</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            Effortless Attendance with <br className="hidden md:block" />
            <span className="gradient-text">Facial Recognition</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10">
            Secure, fast, and automated. SmartAttend transforms how organizations handle attendance, saving time and increasing accuracy instantly.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Link to="/signup" className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-3">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="btn-outline text-lg px-8 py-3">
              View Demo
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature Highlights section */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16"
        >
          {[
             { title: "Lightning Fast", desc: "Recognize faces in under 200ms with high accuracy.", icon: Zap },
             { title: "Real-time Sync", desc: "Instantly updates your dashboard the moment someone arrives.", icon: Clock },
             { title: "Secure & Private", desc: "Enterprise-grade encryption keeps biometric data safe.", icon: ShieldCheck }
          ].map((feature, i) => (
            <div key={i} className="glass-effect p-8 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mb-6 text-purple-400">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-200 mb-3">{feature.title}</h3>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};

export default LandingPage;
