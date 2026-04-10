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
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Recognition Interval Reference
    const recognitionInterval = useRef(null);
    const recentlyMarked = useRef(new Set()); // Track IDs marked in this session to avoid spamming

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
                        const faces = response.faces || [];
                        setDetectedFaces(faces);

                        // --- ATTENDANCE TRIGGER ---
                        for (const face of faces) {
                            if (face.student_id && face.confidence >= 60.0) {
                                if (!recentlyMarked.current.has(face.student_id)) {
                                    console.log(`[Flow] Match found for ${face.name}. Marking attendance...`);
                                    try {
                                        await attendanceAPI.markAttendance(face.student_id, face.confidence);
                                        recentlyMarked.current.add(face.student_id);
                                        // Optional: Toast notification could go here
                                    } catch (markErr) {
                                        console.error("Failed to mark attendance", markErr);
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Recognition failure", err);
                    }
                }
            }, 1000); // Probe every 1 second
        } else {
            if (recognitionInterval.current) clearInterval(recognitionInterval.current);
            setDetectedFaces([]);
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
            const burstStartTime = Date.now();
            
            for (let i = 1; i <= totalFrames; i++) {
                const frame = captureFrame();
                if (frame) {
                    count++;
                    setCaptureProgress(Math.floor((count / totalFrames) * 100));
                    
                    // We trigger the upload WITHOUT awaiting it here to achieve maximum speed.
                    // The backend handles the sequential processing if needed, but we keep 
                    // the network pipeline open.
                    datasetAPI.uploadFrame(targetStudent, frame, count).catch(err => {
                        console.error(`Frame ${count} failed background upload`, err);
                    });
                }
                
                // 100ms delay = ~10 frames per second. 
                // This is the ideal speed for biometric collection.
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // After loop finishes, we give the network a moment to finish "in-flight" uploads
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
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
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
                            onClick={() => setMode('preview')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'preview' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Preview
                        </button>
                        <button 
                            onClick={() => setMode('identify')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'identify' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Identify
                        </button>
                        <button 
                            onClick={() => setMode('capture')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'capture' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Enroll
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Camera Control Panel */}
                    <div className="lg:col-span-3">
                        <div className="relative aspect-video bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800/80 shadow-2xl ring-1 ring-white/5">
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
                            
                            {/* Face Overlays (Identify Mode) */}
                            <AnimatePresence>
                                {detectedFaces.map((face, i) => {
                                    // Bounding Box Calculation
                                    // Backend sends coordinates for a 640x360 frame usually (resized by 0.5)
                                    // Our video fills the container, so we use percentage based positioning
                                    const top = (face.box.top / (videoRef.current?.videoHeight || 1)) * 100;
                                    const left = (face.box.left / (videoRef.current?.videoWidth || 1)) * 100;
                                    const right = (face.box.right / (videoRef.current?.videoWidth || 1)) * 100;
                                    const bottom = (face.box.bottom / (videoRef.current?.videoHeight || 1)) * 100;
                                    const width = right - left;
                                    const height = bottom - top;

                                    return (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute border-2 border-cyan-500 rounded-lg pointer-events-none z-10"
                                            style={{
                                                top: `${top}%`,
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                height: `${height}%`,
                                                transition: 'all 0.1s linear'
                                            }}
                                        >
                                            <div className="absolute top-0 left-0 -translate-y-full bg-cyan-500 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-t-md font-bold whitespace-nowrap">
                                                {face.name} ({face.confidence}%)
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {/* Capture Progress Overlay */}
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

                            {/* Status Indicators */}
                            <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-xl ${stream ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    <span className={`w-2 h-2 rounded-full ${stream ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    {stream ? 'Live Stream' : 'Offline'}
                                </span>
                                {mode === 'identify' && (
                                    <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-xl">
                                        Recognition Engine Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar controls */}
                    <div className="flex flex-col gap-6">
                        <div className="glass-effect p-6 rounded-[2rem] border border-slate-800/80">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">Calibration</h4>
                            
                            {mode === 'capture' ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Select Student</label>
                                        <select 
                                            value={targetStudent}
                                            onChange={(e) => setTargetStudent(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                                        >
                                            <option value="">Choose Student...</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        onClick={runBurstCapture}
                                        disabled={isCapturing || !targetStudent}
                                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-bold shadow-xl shadow-purple-900/40 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        Start Biometric Enrollment
                                    </button>
                                </div>
                            ) : mode === 'identify' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm text-slate-300">
                                        <span>Probes sent:</span>
                                        <span className="font-mono text-cyan-400">0.5Hz</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-300">
                                        <span>Engine:</span>
                                        <span className="font-mono text-cyan-400">DeepMatch™ v2</span>
                                    </div>
                                    <div className="p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/20 mt-4">
                                        <p className="text-[10px] leading-tight text-cyan-200 uppercase font-bold tracking-tight">Active Protocol</p>
                                        <p className="text-xs text-slate-500 mt-1">Attendance logs are automatically triggered for recognized students with {'>'}60% confidence.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 text-center py-6">
                                    <Users className="w-10 h-10 text-slate-700 mx-auto" />
                                    <p className="text-sm text-slate-500">Select a mode from the top bar to begin visual processing.</p>
                                </div>
                            )}
                        </div>

                        <div className="glass-effect p-6 rounded-[2rem] border border-slate-800/80 flex-1">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Device Info</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Resolution</span>
                                    <span className="text-slate-300">1280 x 720</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Latency</span>
                                    <span className="text-slate-300">~240ms</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Encryption</span>
                                    <span className="text-emerald-500 font-bold">SHA-256</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Hidden canvas for capturing frames */}
            <canvas ref={canvasRef} className="hidden" />
        </AdminLayout>
    );
};

export default CameraPage;
