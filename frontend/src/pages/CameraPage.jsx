import { useState, useEffect, useRef } from 'react';
import { Camera, StopCircle, RefreshCw, UserCheck, ShieldCheck, Loader2, Play, Users, Layout } from 'lucide-react';
import { studentsAPI, recognitionAPI, datasetAPI, attendanceAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';

const CameraPage = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [mode, setMode] = useState('preview'); // preview, identify, capture
    const [students, setStudents] = useState([]);
    const [targetStudent, setTargetStudent] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureProgress, setCaptureProgress] = useState(0);
    const [detectedFaces, setDetectedFaces] = useState([]);
    const [markedHistory, setMarkedHistory] = useState([]); // List of {id, name, time, status, color}
    const [showFlash, setShowFlash] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Recognition & Countdown State
    const recognitionInterval = useRef(null);
    const recentlyMarked = useRef(new Set()); 
    const [countdown, setCountdown] = useState({ studentId: null, value: 0, name: '' });
    const countdownRef = useRef({ studentId: null, value: 0 }); // Use ref for logic to avoid stale closures in interval

    useEffect(() => {
        fetchStudents();
        startCamera();
        return () => stopCamera();
    }, []);

    const fetchStudents = async () => {
        try {
            const data = await studentsAPI.getAll();
            setStudents(data);
        } catch (err) {
            setError("Failed to load students list.");
        }
    };

    const startCamera = async () => {
        setIsLoading(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            setError("Cannot access webcam. Please check permissions.");
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (recognitionInterval.current) {
            clearInterval(recognitionInterval.current);
        }
    };

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return null;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
    };

    // --- IDENTIFY LOGIC ---
    useEffect(() => {
        if (mode === 'identify') {
            recognitionInterval.current = setInterval(async () => {
                const frame = captureFrame();
                if (frame) {
                    try {
                        const response = await recognitionAPI.identify(frame);
                        const newFaces = response.faces || [];
                        
                        // 1. Update detected faces (Clean, no-sticking approach)
                        setDetectedFaces(newFaces);

                        // 2. Find Best Candidate for Attendance (Recognized face not recently marked)
                        const candidate = newFaces.find(f => 
                            f.student_id && 
                            (f.status === "Attendance Marked" || f.status === "Already Marked") &&
                            !recentlyMarked.current.has(f.student_id)
                        );

                        if (candidate) {
                            // If it's already marked in DB but we just found out
                            if (candidate.status === "Already Marked") {
                                recentlyMarked.current.add(candidate.student_id);
                                setMarkedHistory(prev => [{
                                    id: candidate.student_id,
                                    name: candidate.name,
                                    time: 'Already Recorded',
                                    status: 'Prev'
                                }, ...prev].slice(0, 10));
                                
                                // Reset countdown if we were counting down for them
                                setCountdown({ studentId: null, value: 0, name: '' });
                                countdownRef.current = { studentId: null, value: 0 };
                                return;
                            }

                            // Handle New Attendance with 5-second countdown
                            if (countdownRef.current.studentId === candidate.student_id) {
                                // Continue counting down
                                const nextValue = countdownRef.current.value - 1;
                                if (nextValue <= 0) {
                                    // TRIGGER MARKING
                                    try {
                                        recentlyMarked.current.add(candidate.student_id);
                                        await attendanceAPI.markAttendance(candidate.student_id, candidate.confidence);
                                        
                                        setShowFlash(true);
                                        setTimeout(() => setShowFlash(false), 500);
                                        
                                        setMarkedHistory(prev => [{
                                            id: candidate.student_id,
                                            name: candidate.name,
                                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                            status: 'Marked'
                                        }, ...prev].slice(0, 10));

                                        setCountdown({ studentId: null, value: 0, name: '' });
                                        countdownRef.current = { studentId: null, value: 0 };
                                    } catch (err) {
                                        console.error("Auto-mark failed:", err);
                                    }
                                } else {
                                    setCountdown({ studentId: candidate.student_id, value: nextValue, name: candidate.name });
                                    countdownRef.current = { studentId: candidate.student_id, value: nextValue };
                                }
                            } else {
                                // Start new countdown
                                setCountdown({ studentId: candidate.student_id, value: 5, name: candidate.name });
                                countdownRef.current = { studentId: candidate.student_id, value: 5 };
                            }
                        } else {
                            // No candidate or person left frame: Reset countdown
                            if (countdownRef.current.studentId !== null) {
                                setCountdown({ studentId: null, value: 0, name: '' });
                                countdownRef.current = { studentId: null, value: 0 };
                            }
                        }
                    } catch (err) {
                        console.error("Recognition failure", err);
                    }
                }
            }, 1000);
        } else {
            if (recognitionInterval.current) clearInterval(recognitionInterval.current);
            setDetectedFaces([]);
            setCountdown({ studentId: null, value: 0, name: '' });
            countdownRef.current = { studentId: null, value: 0 };
        }
    }, [mode]);

    // --- CAPTURE LOGIC ---
    const runBurstCapture = async () => {
        if (!targetStudent) {
            setError("Please select a student first.");
            return;
        }
        setIsCapturing(true);
        setCaptureProgress(0);
        setError('');

        const totalFrames = 100;
        let count = 0;

        try {
            for (let i = 1; i <= totalFrames; i++) {
                const frame = captureFrame();
                if (frame) {
                    count++;
                    setCaptureProgress(Math.floor((count / totalFrames) * 100));
                    datasetAPI.uploadFrame(targetStudent, frame, count).catch(err => {
                        console.error(`Frame ${count} failed background upload`, err);
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            setTimeout(() => {
                setIsCapturing(false);
                setMode('preview');
                alert("Dataset capture high-speed burst complete! All 100 frames sent to server.");
            }, 1000);

        } catch (err) {
            setError("Speed-burst capture failed.");
            setIsCapturing(false);
        }
    };

    const getInstruction = () => {
        if (captureProgress < 25) return "Look Straight at the Camera";
        if (captureProgress < 50) return "Turn your face slowly to the Left";
        if (captureProgress < 75) return "Turn your face slowly to the Right";
        return "Tilt your head slightly (Up/Down)";
    };

    return (
        <AdminLayout>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Camera className="text-cyan-400" />
                            Visual Intelligence Lab
                        </h1>
                        <p className="text-slate-400">Manage real-time recognition and biometric enrollment.</p>
                    </div>

                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
                        <button
                            onClick={() => { setMode('preview'); setMarkedHistory([]); recentlyMarked.current.clear(); }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'preview' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >Preview</button>
                        <button
                            onClick={() => setMode('identify')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'identify' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >Identify</button>
                        <button
                            onClick={() => setMode('capture')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'capture' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >Enroll</button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-9 relative">
                        <div className="relative aspect-video bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800/80 shadow-2xl ring-1 ring-white/5">
                            <AnimatePresence>
                                {showFlash && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.3 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-40 bg-emerald-500 pointer-events-none"
                                    />
                                )}
                            </AnimatePresence>

                            {isLoading && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                                    <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                                </div>
                            )}

                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className={`w-full h-full object-cover transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            />

                            <AnimatePresence>
                                {detectedFaces.map((face, i) => {
                                    const top = (face.box.top / (videoRef.current?.videoHeight || 1)) * 100;
                                    const left = (face.box.left / (videoRef.current?.videoWidth || 1)) * 100;
                                    const right = (face.box.right / (videoRef.current?.videoWidth || 1)) * 100;
                                    const bottom = (face.box.bottom / (videoRef.current?.videoHeight || 1)) * 100;
                                    const width = right - left;
                                    const height = bottom - top;

                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute border-2 rounded-2xl pointer-events-none z-10"
                                            style={{
                                                top: `${top}%`,
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                height: `${height}%`,
                                                borderColor: face.color,
                                                boxShadow: `0 0 15px ${face.color}33`,
                                                transition: 'all 0.1s linear'
                                            }}
                                        >
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-slate-900/90 backdrop-blur-md rounded-full border border-white/10 flex flex-col items-center">
                                                <span className="text-white text-[10px] sm:text-xs font-bold whitespace-nowrap">{face.name} ({face.confidence}%)</span>
                                                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: face.color }}>{face.status}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {/* Attendance Countdown Overlay */}
                            <AnimatePresence>
                                {countdown.value > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.5 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] pointer-events-none"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="relative">
                                                <svg className="w-32 h-32 transform -rotate-90">
                                                    <circle
                                                        className="text-slate-800"
                                                        strokeWidth="8"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="58"
                                                        cx="64"
                                                        cy="64"
                                                    />
                                                    <motion.circle
                                                        className="text-cyan-500"
                                                        strokeWidth="8"
                                                        strokeDasharray={364.4}
                                                        initial={{ strokeDashoffset: 364.4 }}
                                                        animate={{ strokeDashoffset: 364.4 - (364.4 * (5 - countdown.value)) / 5 }}
                                                        strokeLinecap="round"
                                                        stroke="currentColor"
                                                        fill="transparent"
                                                        r="58"
                                                        cx="64"
                                                        cy="64"
                                                    />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white">
                                                    {countdown.value}
                                                </span>
                                            </div>
                                            <div className="mt-6 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 text-center">
                                                <p className="text-xs text-white/60 uppercase tracking-[0.2em] font-bold mb-1">Verifying Identity</p>
                                                <p className="text-xl text-white font-bold">{countdown.name}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {isCapturing && (
                                <div className="absolute inset-0 z-30 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-8">
                                    <div className="w-full max-w-md text-center">
                                        <h3 className="text-2xl font-bold text-white mb-2">{captureProgress}% Complete</h3>
                                        <p className="text-cyan-400 font-medium mb-6 animate-pulse">{getInstruction()}</p>
                                        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${captureProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-xl ${stream ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    <span className={`w-2 h-2 rounded-full ${stream ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    {stream ? 'Live' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <div className="glass-effect p-6 rounded-[2rem] border border-slate-800/80 flex-1 flex flex-col overflow-hidden min-h-[400px]">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Session Log
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                                <AnimatePresence initial={false}>
                                    {markedHistory.map((item, i) => (
                                        <motion.div
                                            key={`${item.id}-${i}`}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800/50 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <span className="text-sm text-slate-200 font-medium truncate max-w-[100px]">{item.name}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {markedHistory.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center opacity-30 mt-10">
                                        <UserCheck className="w-12 h-12 mb-2" />
                                        <p className="text-xs">No activity detected yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-effect p-6 rounded-[2rem] border border-slate-800/80">
                            {mode === 'capture' ? (
                                <div className="space-y-4">
                                    <select
                                        value={targetStudent}
                                        onChange={(e) => setTargetStudent(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">Choose Student...</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button
                                        onClick={runBurstCapture}
                                        disabled={isCapturing || !targetStudent}
                                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-xl transition-all disabled:opacity-50"
                                    >Enroll Face</button>
                                </div>
                            ) : mode === 'identify' ? (
                                <div className="p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/20">
                                    <p className="text-[10px] text-cyan-200 uppercase font-bold tracking-tight mb-1">Status Protocol</p>
                                    <div className="space-y-2 mt-2">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Recognized / Marked</div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Low Confidence</div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Unknown</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                                    <p className="text-xs text-slate-500">System Ready</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </AdminLayout>
    );
};

export default CameraPage;
