
import React, { useState, useEffect, useRef } from 'react';
import { Team, ContestState, Problem, Submission, ContestStatus } from '../types';
import { Icons } from '../constants';
import { evaluateCode } from '../services/geminiService';

interface TeamBattlegroundProps {
  team: Team;
  contest: ContestState;
  problem: Problem;
  submissions: Submission[];
  onAddSubmission: (submission: Submission) => void;
  onViolation: () => void;
}

type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported';

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', extension: 'js', boilerplate: '// Write your solution using Standard I/O\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf8");\n\nfunction solve(data) {\n  // Process input and console.log output\n}\n\nsolve(input);' },
  { id: 'python', name: 'Python', extension: 'py', boilerplate: '# Write your solution using Standard I/O\nimport sys\n\ndef solve():\n    # input_data = sys.stdin.read()\n    # print("output")\n    pass\n\nif __name__ == "__main__":\n    solve()' },
  { id: 'cpp', name: 'C++', extension: 'cpp', boilerplate: '// Write your solution using Standard I/O\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // int n; cin >> n;\n    // cout << n << endl;\n    return 0;\n}' },
  { id: 'java', name: 'Java', extension: 'java', boilerplate: '// Write your solution using Standard I/O\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // if (sc.hasNextInt()) { int n = sc.nextInt(); }\n    }\n}' }
];

const TeamBattleground: React.FC<TeamBattlegroundProps> = ({ team, contest, problem, submissions, onAddSubmission, onViolation }) => {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].boilerplate);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'problem' | 'submissions'>('problem');
  const [editorTab, setEditorTab] = useState<'code' | 'output'>('code');
  const [timer, setTimer] = useState("00:00:00");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentSessionViolations, setCurrentSessionViolations] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const requestCamera = async () => {
    setCameraStatus('requesting');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStatus('active');
        
        const options = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
          mediaRecorderRef.current.start(1000); 
        }
      }
    } catch (err) {
      console.error("Proctoring camera access denied:", err);
      setCameraStatus('denied');
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const logViolation = (type: string) => {
    onViolation();
    setCurrentSessionViolations(v => v + 1);
    alert(`PROCTOR ALERT: ${type} is strictly prohibited during the contest. This incident has been recorded.`);
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      const isInFull = !!document.fullscreenElement;
      setIsFullScreen(isInFull);
      
      // If user exits fullscreen during an active contest, log a violation
      if (!isInFull && contest.status === ContestStatus.ACTIVE) {
        logViolation("Exiting Secure Fullscreen Mode");
      }
    };

    const handleVisibilityChange = () => {
      if ((document.visibilityState === 'hidden' || !document.hasFocus()) && contest.status === ContestStatus.ACTIVE && isFullScreen) {
        logViolation("Tab switching or Window focus loss");
      }
    };

    const preventProctorBypass = (e: KeyboardEvent) => {
      // Prevent common DevTools shortcuts
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
        e.preventDefault();
        logViolation("Attempting to access Developer Tools");
      }
    };

    const preventClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("PROCTOR WARNING: Clipboard actions (Copy/Paste) are disabled in the Battleground.");
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('keydown', preventProctorBypass);
    document.addEventListener('contextmenu', preventContextMenu);
    
    // Add clipboard listeners to the container
    const container = containerRef.current;
    if (container) {
      container.addEventListener('paste', preventClipboard as EventListener);
      container.addEventListener('copy', preventClipboard as EventListener);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('keydown', preventProctorBypass);
      document.removeEventListener('contextmenu', preventContextMenu);
      if (container) {
        container.removeEventListener('paste', preventClipboard as EventListener);
        container.removeEventListener('copy', preventClipboard as EventListener);
      }
    };
  }, [contest.status, isFullScreen]);

  useEffect(() => {
    if (contest.status === ContestStatus.ACTIVE) {
      requestCamera();
    }
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [contest.status]);

  useEffect(() => {
    if (contest.status === ContestStatus.ACTIVE && contest.startTime) {
      const interval = setInterval(() => {
        const remaining = (contest.startTime! + contest.durationMinutes * 60000) - Date.now();
        if (remaining <= 0) {
          setTimer("00:00:00");
          clearInterval(interval);
        } else {
          const s = Math.floor(remaining / 1000);
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          const sc = s % 60;
          setTimer(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [contest]);

  const handleLangChange = (langId: string) => {
    const lang = LANGUAGES.find(l => l.id === langId);
    if (lang) {
      setSelectedLang(lang);
      setCode(lang.boilerplate);
    }
  };

  const handleRunCode = async () => {
    if (contest.status !== ContestStatus.ACTIVE) return;
    setIsRunning(true);
    setEditorTab('output');
    try {
      const result = await evaluateCode(code, problem, selectedLang.id);
      setLastResult(result);
    } catch (err) {
      alert("Execution failed. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (contest.status !== ContestStatus.ACTIVE) return;
    setIsSubmitting(true);
    setEditorTab('output');
    try {
      const result = await evaluateCode(code, problem, selectedLang.id);
      setLastResult(result);
      
      const submission: Submission = {
        id: `sub-${Date.now()}`,
        teamId: team.id,
        problemId: problem.id,
        code,
        language: selectedLang.name,
        timestamp: Date.now(),
        results: result.results,
        score: result.totalScore,
        aiScore: result.aiScore,
        aiFeedback: result.aiFeedback,
        proctorViolations: currentSessionViolations
      };
      
      onAddSubmission(submission);
    } catch (err) {
      alert("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (contest.status === ContestStatus.LOCKED) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center bg-slate-950">
        <div className="max-w-md space-y-6">
          <div className="inline-block p-6 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/20 mb-4 animate-pulse">
            <Icons.Lock />
          </div>
          <h2 className="text-3xl font-black text-white">Arena Locked</h2>
          <p className="text-slate-400">The battle has not started yet. Please wait for the admin to initialize the contest session.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950 relative select-none">
      {/* Full Screen Enforcement Overlay */}
      {!isFullScreen && contest.status === ContestStatus.ACTIVE && (
        <div className="absolute inset-0 z-[999] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-500">
          <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-500/30 animate-pulse">
            <Icons.Lock />
          </div>
          <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">Security Breach Detected</h2>
          <p className="text-slate-400 max-w-lg mb-10 text-lg leading-relaxed">
            The Battleground requires a <span className="text-rose-500 font-bold">Secure Fullscreen Environment</span>. Continuous camera monitoring and tab-switching logs are active. 
            Exiting this mode will be logged as a violation.
          </p>
          <button 
            onClick={toggleFullScreen}
            className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-2xl shadow-indigo-600/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 text-xl"
          >
            <Icons.Play />
            RESUME SECURE ARENA
          </button>
        </div>
      )}

      {/* Proctoring Camera Overlay */}
      <div className="absolute bottom-8 right-8 z-[100] group">
        <div className="relative w-56 h-36 bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all hover:scale-110">
           {cameraStatus === 'active' ? (
             <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale opacity-80" />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
               <span className="text-rose-500 mb-2"><Icons.XCircle /></span>
               <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">Monitoring Required</p>
             </div>
           )}
           <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/5">
              <span className={`w-2 h-2 rounded-full ${cameraStatus === 'active' ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">LIVE PROC</span>
           </div>
        </div>
      </div>

      {/* Sidebar Monitoring */}
      <div className="lg:col-span-4 border-r border-slate-800 flex flex-col bg-slate-900/10 backdrop-blur-sm">
        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('problem')}
            className={`flex-1 py-5 text-xs font-black border-b-2 transition-all uppercase tracking-widest ${activeTab === 'problem' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Mission Brief
          </button>
          <button 
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 py-5 text-xs font-black border-b-2 transition-all uppercase tracking-widest ${activeTab === 'submissions' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Intel Logs ({submissions.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
          {activeTab === 'problem' ? (
            <>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                    Tier: {problem?.difficulty || 'Standard'}
                  </span>
                  <h2 className="text-3xl font-black text-white leading-tight">{problem?.title}</h2>
                </div>
                {currentSessionViolations > 0 && (
                  <div className="px-4 py-2 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase animate-bounce shadow-lg shadow-rose-600/30">
                    BREACHES: {currentSessionViolations}
                  </div>
                )}
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">{problem?.description}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3">Technical Constraints</h3>
                <ul className="space-y-3">
                  {problem?.constraints.map((c, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3">Validation Cases</h3>
                {problem?.testCases.map((tc, i) => (
                  <div key={tc.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Input Vector</p>
                    <pre className="bg-black/40 p-3 rounded-xl text-indigo-400 text-xs mono border border-white/5">{tc.input}</pre>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expected Result</p>
                    <pre className="bg-black/40 p-3 rounded-xl text-emerald-400 text-xs mono border border-white/5">{tc.expectedOutput}</pre>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {submissions.map((s) => (
                <div key={s.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all group">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-500 font-mono font-bold">{new Date(s.timestamp).toLocaleTimeString()}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${s.proctorViolations ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {s.proctorViolations ? `${s.proctorViolations} INFRACTIONS` : 'COMPLIANT'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {s.results.map((res, i) => (
                      <div key={i} title={res.passed ? 'Success' : 'Fail'} className={`w-2 h-2 rounded-full ${res.passed ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
           <div>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Mission Clock</p>
             <p className="text-4xl font-black text-indigo-400 mono tracking-tighter">{timer}</p>
           </div>
           <div className="text-right">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl ${cameraStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                {cameraStatus === 'active' ? 'SECURED' : 'UNGUARDED'}
              </span>
           </div>
        </div>
      </div>

      {/* Editor & Console */}
      <div className="lg:col-span-8 flex flex-col bg-slate-950 overflow-hidden relative">
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/20 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <select 
              value={selectedLang.id} 
              onChange={(e) => handleLangChange(e.target.value)}
              className="bg-slate-800 text-xs font-black text-slate-200 px-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none min-w-[140px]"
            >
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
              <button onClick={() => setEditorTab('code')} className={`px-5 py-2 text-[10px] font-black rounded-lg transition-all ${editorTab === 'code' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>SOURCE</button>
              <button onClick={() => setEditorTab('output')} className={`px-5 py-2 text-[10px] font-black rounded-lg transition-all ${editorTab === 'output' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>CONSOLE</button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            Active Surveillance
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {editorTab === 'code' ? (
            <div className="flex-1 flex flex-col bg-slate-950 p-8">
               <textarea 
                 value={code} 
                 onChange={(e) => setCode(e.target.value)} 
                 disabled={contest.status !== ContestStatus.ACTIVE} 
                 className="w-full h-full bg-transparent text-slate-200 mono text-base focus:outline-none resize-none leading-relaxed selection:bg-indigo-500/30" 
                 spellCheck={false}
                 placeholder="Terminal ready. Begin algorithmic implementation..."
               />
            </div>
          ) : (
            <div className="flex-1 bg-slate-900/20 overflow-y-auto p-10 scrollbar-thin">
              {isRunning || isSubmitting ? (
                <div className="h-full flex flex-col items-center justify-center text-indigo-400 gap-6">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.2)]" />
                  <p className="text-lg font-black uppercase tracking-widest animate-pulse">Running Remote Validation...</p>
                </div>
              ) : lastResult ? (
                <div className="max-w-4xl mx-auto space-y-8">
                   <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Diagnostic Report</h3>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Qualitative Grade</span>
                        <span className="text-2xl font-black text-indigo-400">{lastResult.aiScore || 0}%</span>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lastResult.results.map((res: any, i: number) => (
                      <div key={i} className={`p-6 rounded-[2rem] border transition-all ${res.passed ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Buffer {i+1}</span>
                          {res.passed ? <Icons.CheckCircle /> : <Icons.XCircle />}
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-600 uppercase">Received Output</p>
                          <pre className="text-xs mono bg-black/50 p-3 rounded-xl text-slate-300 whitespace-pre-wrap border border-white/5">{res.actualOutput || 'NULL'}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-indigo-600/5 border border-indigo-500/20 p-8 rounded-[2.5rem] mt-10">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Evaluator Feedback</p>
                    <p className="text-slate-300 italic text-lg leading-relaxed">{lastResult.aiFeedback}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                  <Icons.Timer />
                  <p className="italic font-medium">Console initialized. Waiting for execution command.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-24 border-t border-slate-800 px-10 flex items-center justify-between bg-slate-900/30 backdrop-blur-md">
          <button 
            onClick={toggleFullScreen} 
            className="text-[10px] font-black text-slate-500 hover:text-indigo-400 transition-all uppercase tracking-widest flex items-center gap-3"
          >
            <div className={`w-3 h-3 rounded-full ${isFullScreen ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            Secure Protocol: {isFullScreen ? 'ENFORCED' : 'OFFLINE'}
          </button>
          <div className="flex gap-4">
            <button 
              onClick={handleRunCode} 
              disabled={isRunning || isSubmitting || contest.status !== ContestStatus.ACTIVE} 
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-black rounded-2xl border border-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Run Diagnostic
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isRunning || isSubmitting || contest.status !== ContestStatus.ACTIVE} 
              className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-sm transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Submit Solution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamBattleground;
