
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
        
        // Setup MediaRecorder for "recording" simulation
        const options = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
          mediaRecorderRef.current.start(1000); 
          console.debug("Proctor recording started");
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

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    const handleVisibilityChange = () => {
      if ((document.visibilityState === 'hidden' || !document.hasFocus()) && contest.status === ContestStatus.ACTIVE && isFullScreen) {
        onViolation();
        setCurrentSessionViolations(v => v + 1);
        alert("PROCTOR WARNING: Tab switching or losing focus is strictly prohibited. This incident has been logged for Admin review.");
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, [contest.status, onViolation, isFullScreen]);

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
    <div ref={containerRef} className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950 relative">
      {/* Full Screen Enforcement Overlay */}
      {!isFullScreen && contest.status === ContestStatus.ACTIVE && (
        <div className="absolute inset-0 z-[999] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20 animate-bounce">
            <Icons.Lock />
          </div>
          <h2 className="text-4xl font-black text-white mb-4">Secure Mode Required</h2>
          <p className="text-slate-400 max-w-md mb-8">
            To prevent cheating, this competition must be completed in Full Screen mode. Camera monitoring is active.
          </p>
          <button 
            onClick={toggleFullScreen}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-3"
          >
            <Icons.Play />
            Enter Secure Arena
          </button>
        </div>
      )}

      {/* Proctoring Camera Overlay (Floating Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-[100] group">
        <div className="relative w-48 h-32 md:w-56 md:h-36 bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl transition-all hover:scale-105">
           {cameraStatus === 'active' ? (
             <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale opacity-80" />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
               <span className="text-rose-500 mb-2"><Icons.XCircle /></span>
               <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">
                 {cameraStatus === 'denied' ? 'Camera Denied' : cameraStatus === 'unsupported' ? 'System Unsupported' : 'Initializing...'}
               </p>
               {cameraStatus === 'denied' && (
                 <button onClick={requestCamera} className="mt-2 px-2 py-1 bg-indigo-600 text-[8px] font-bold text-white rounded">Retry</button>
               )}
             </div>
           )}
           
           <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
              <span className={`w-2 h-2 rounded-full ${cameraStatus === 'active' ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[8px] font-black text-white uppercase tracking-widest">
                {cameraStatus === 'active' ? 'LIVE PROC' : 'PROC OFF'}
              </span>
           </div>
           
           <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[8px] font-mono text-white/50 bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                {team.name}
              </span>
           </div>
        </div>
      </div>

      {/* Sidebar Monitoring */}
      <div className="lg:col-span-4 border-r border-slate-800 flex flex-col bg-slate-900/20 backdrop-blur-sm">
        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('problem')}
            className={`flex-1 py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-widest ${activeTab === 'problem' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Problem
          </button>
          <button 
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-widest ${activeTab === 'submissions' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            History ({submissions.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {activeTab === 'problem' ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">
                    {problem?.difficulty || 'Standard'}
                  </span>
                  <h2 className="text-2xl font-black text-white">{problem?.title}</h2>
                </div>
                {currentSessionViolations > 0 && (
                  <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-black text-rose-500 animate-pulse">
                    VIOLATIONS: {currentSessionViolations}
                  </div>
                )}
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{problem?.description}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Constraints</h3>
                <ul className="space-y-2">
                  {problem?.constraints.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Example Cases</h3>
                {problem?.testCases.map((tc, i) => (
                  <div key={tc.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Input</p>
                    <pre className="bg-black/40 p-2 rounded text-indigo-300 text-xs mono">{tc.input}</pre>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Expected Output</p>
                    <pre className="bg-black/40 p-2 rounded text-emerald-400 text-xs mono">{tc.expectedOutput}</pre>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => (
                <div key={s.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(s.timestamp).toLocaleTimeString()}</span>
                    {s.proctorViolations && s.proctorViolations > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/10 text-rose-500">
                        {s.proctorViolations} VIOLATIONS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-500">
                        CLEAN ATTEMPT
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {s.results.map((res, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${res.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar Section */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/40">
           <div className="text-left flex-1">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Session Clock</p>
             <p className="text-3xl font-black text-indigo-400 mono">{timer}</p>
           </div>
           <div className="flex flex-col items-end">
              <span className={`px-3 py-1 rounded text-[9px] font-black uppercase mb-1 ${cameraStatus === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {cameraStatus === 'active' ? 'Secured' : 'Attention'}
              </span>
              <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Proctor Feed Active</span>
           </div>
        </div>
      </div>

      {/* Editor & Console */}
      <div className="lg:col-span-8 flex flex-col bg-slate-950 overflow-hidden relative">
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/30">
          <div className="flex items-center gap-4">
            <select 
              value={selectedLang.id} 
              onChange={(e) => handleLangChange(e.target.value)}
              className="bg-slate-800/80 text-xs font-bold text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
            >
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div className="flex gap-1">
              <button onClick={() => setEditorTab('code')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${editorTab === 'code' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>EDITOR</button>
              <button onClick={() => setEditorTab('output')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${editorTab === 'output' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>CONSOLE</button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-3 py-1 rounded-full border border-indigo-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Active Surveillance
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {editorTab === 'code' ? (
            <div className="flex-1 flex flex-col bg-slate-950 p-6">
               <textarea 
                 value={code} 
                 onChange={(e) => setCode(e.target.value)} 
                 disabled={contest.status !== ContestStatus.ACTIVE} 
                 className="w-full h-full bg-transparent text-slate-300 mono text-sm focus:outline-none resize-none leading-relaxed" 
                 spellCheck={false}
                 placeholder="Write your code here..."
               />
            </div>
          ) : (
            <div className="flex-1 bg-slate-900/30 overflow-y-auto p-6 scrollbar-thin">
              {isRunning || isSubmitting ? (
                <div className="h-full flex flex-col items-center justify-center text-indigo-400 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-black uppercase tracking-widest animate-pulse">Running Logic Validation...</p>
                </div>
              ) : lastResult ? (
                <div className="max-w-3xl mx-auto space-y-6">
                   <h3 className="text-xl font-black text-white border-b border-slate-800 pb-4">Validation Output</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lastResult.results.map((res: any, i: number) => (
                      <div key={i} className={`p-4 rounded-2xl border ${res.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Case {i+1}</span>
                          {res.passed ? <span className="text-emerald-400 text-[10px] font-black uppercase">Accepted</span> : <span className="text-rose-400 text-[10px] font-black uppercase">Failed</span>}
                        </div>
                        {!res.passed && <pre className="text-[10px] mono bg-black/40 p-2 rounded text-rose-300 whitespace-pre-wrap">{res.actualOutput || 'Empty Output'}</pre>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">Console empty. Run code to see results.</div>
              )}
            </div>
          )}
        </div>

        <div className="h-20 border-t border-slate-800 px-6 flex items-center justify-between bg-slate-900/20">
          <button onClick={toggleFullScreen} className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2 hover:text-indigo-400 transition-colors">
            <Icons.Code />
            {isFullScreen ? 'Exit Secure Mode' : 'Enter Secure Mode'}
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handleRunCode} 
              disabled={isRunning || isSubmitting || contest.status !== ContestStatus.ACTIVE} 
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl border border-slate-700 disabled:opacity-50"
            >
              Run Code
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isRunning || isSubmitting || contest.status !== ContestStatus.ACTIVE} 
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-sm transition-all shadow-lg"
            >
              Final Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamBattleground;
