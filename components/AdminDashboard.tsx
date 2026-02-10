
import React, { useState } from 'react';
import { ContestState, Team, Submission, ContestStatus, Problem, TestCase } from '../types';
import { Icons } from '../constants';

interface AdminDashboardProps {
  contest: ContestState;
  teams: Team[];
  submissions: Submission[];
  onStart: (duration: number) => void;
  onStop: () => void;
  onCreateTeam: (name: string, password: string) => void;
  onDeleteTeam: (id: string) => void;
  onAddProblem: (problem: Problem) => void;
  onDeleteProblem: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  contest, teams, submissions, onStart, onStop, onCreateTeam, onDeleteTeam, onAddProblem, onDeleteProblem 
}) => {
  const [duration, setDuration] = useState(contest.durationMinutes);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPass, setNewTeamPass] = useState('');
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'teams' | 'problems' | 'setup'>('none');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // New Problem Form State
  const [pTitle, setPTitle] = useState('');
  const [pDifficulty, setPDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [pDescription, setPDescription] = useState('');
  const [pConstraints, setPConstraints] = useState<string[]>(['']);
  const [pTestCases, setPTestCases] = useState<Omit<TestCase, 'id'>[]>([{ input: '', expectedOutput: '' }]);

  const totalViolations = teams.reduce((acc, t) => acc + (t.violations || 0), 0);

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeamName.trim() && newTeamPass.trim()) {
      onCreateTeam(newTeamName, newTeamPass);
      setNewTeamName('');
      setNewTeamPass('');
      setActiveOverlay('none');
    }
  };

  const handleCreateProblem = (e: React.FormEvent) => {
    e.preventDefault();
    const newProblem: Problem = {
      id: `p-${Date.now()}`,
      title: pTitle,
      difficulty: pDifficulty,
      description: pDescription,
      constraints: pConstraints.filter(c => c.trim()),
      testCases: pTestCases.map((tc, idx) => ({ ...tc, id: `tc-${idx}-${Date.now()}` }))
    };
    onAddProblem(newProblem);
    setPTitle('');
    setPDescription('');
    setPConstraints(['']);
    setPTestCases([{ input: '', expectedOutput: '' }]);
    setActiveOverlay('none');
  };

  const sqlSchema = `-- Run these in your PostgreSQL terminal
CREATE TABLE contest_state (
    id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'LOCKED',
    start_time BIGINT,
    duration_minutes INTEGER DEFAULT 60
);

CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    total_score INTEGER DEFAULT 0,
    violations INTEGER DEFAULT 0,
    assigned_problem_id TEXT,
    last_submission_time BIGINT
);

CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    team_id TEXT REFERENCES teams(id),
    data JSONB NOT NULL
);

CREATE TABLE problems (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
);

INSERT INTO contest_state (id, status, duration_minutes) VALUES (1, 'LOCKED', 60);`;

  return (
    <div className="h-full overflow-y-auto p-8 max-w-7xl mx-auto space-y-8 pb-20 scrollbar-thin">
      {/* Header & Control Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${contest.status === ContestStatus.ACTIVE ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
            <h2 className="text-4xl font-black text-white tracking-tight">Arena Dashboard</h2>
          </div>
          <p className="text-slate-400 text-sm font-medium">Contest Integrity: <span className={totalViolations > 10 ? "text-rose-500" : "text-emerald-500"}>{totalViolations > 10 ? 'Flagged' : 'Stable'}</span> • {totalViolations} total violations detected.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setActiveOverlay(activeOverlay === 'teams' ? 'none' : 'teams')} className={`px-5 py-3.5 border font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2 ${activeOverlay === 'teams' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'}`}>
            <Icons.Users /> Teams
          </button>
          <button onClick={() => setActiveOverlay(activeOverlay === 'problems' ? 'none' : 'problems')} className={`px-5 py-3.5 border font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2 ${activeOverlay === 'problems' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'}`}>
            <Icons.Code /> Bank
          </button>
          <button onClick={() => setActiveOverlay(activeOverlay === 'setup' ? 'none' : 'setup')} className={`px-5 py-3.5 border font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2 ${activeOverlay === 'setup' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-500/80'}`}>
            <Icons.Lock /> System Setup
          </button>
          
          <div className="h-10 w-[1px] bg-slate-800 hidden lg:block" />
          
          {contest.status === ContestStatus.LOCKED ? (
            <div className="flex items-center gap-2 bg-indigo-600/10 p-1.5 rounded-2xl border border-indigo-500/20">
              <input 
                type="number" 
                value={duration} 
                onChange={(e) => setDuration(parseInt(e.target.value))} 
                className="w-16 bg-transparent text-indigo-400 font-black text-center focus:outline-none"
              />
              <button onClick={() => onStart(duration)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all">
                <Icons.Play /> Launch
              </button>
            </div>
          ) : (
            <button onClick={onStop} className="px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-600/30 flex items-center gap-2 transition-all">
              <Icons.Lock /> Terminate Battle
            </button>
          )}
        </div>
      </div>

      {/* Overlays */}
      {activeOverlay === 'teams' && (
        <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-[2rem] shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Icons.Users /></div>
              Enroll New Teams
            </h3>
            <button onClick={() => setActiveOverlay('none')} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors">&times;</button>
          </div>
          <form onSubmit={handleCreateTeam} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 focus:outline-none" placeholder="Team Name" required />
            <input type="password" value={newTeamPass} onChange={e => setNewTeamPass(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 focus:outline-none" placeholder="Credential Password" required />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition-all">Register Team</button>
          </form>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teams.map(t => (
              <div key={t.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{t.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">PWD: {t.password}</span>
                </div>
                <button onClick={() => onDeleteTeam(t.id)} className="text-rose-500/30 group-hover:text-rose-500 transition-all p-2"><Icons.XCircle /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeOverlay === 'problems' && (
        <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-[2rem] shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Icons.Code /></div>
              Algorithmic Problem Bank
            </h3>
            <button onClick={() => setActiveOverlay('none')} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors">&times;</button>
          </div>
          <form onSubmit={handleCreateProblem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <input value={pTitle} onChange={e => setPTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 focus:outline-none transition-all" placeholder="Title" required />
              <select value={pDifficulty} onChange={e => setPDifficulty(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 focus:outline-none appearance-none">
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <textarea value={pDescription} onChange={e => setPDescription(e.target.value)} className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white resize-none focus:border-indigo-500 focus:outline-none transition-all" placeholder="Problem Statement..." required />
            </div>
            <div className="space-y-5 flex flex-col">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Test Cases</label>
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-80 scrollbar-none">
                 {pTestCases.map((tc, i) => (
                   <div key={i} className="flex gap-3 items-start animate-fade-in">
                     <textarea value={tc.input} onChange={e => { const n = [...pTestCases]; n[i].input = e.target.value; setPTestCases(n); }} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-indigo-300 resize-none h-16" placeholder="Input" />
                     <textarea value={tc.expectedOutput} onChange={e => { const n = [...pTestCases]; n[i].expectedOutput = e.target.value; setPTestCases(n); }} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-emerald-300 resize-none h-16" placeholder="Output" />
                     <button type="button" onClick={() => setPTestCases(pTestCases.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-400 p-2">&times;</button>
                   </div>
                 ))}
               </div>
               <button type="button" onClick={() => setPTestCases([...pTestCases, { input: '', expectedOutput: '' }])} className="w-full py-3 bg-slate-800 text-indigo-400 font-bold rounded-xl text-xs hover:bg-slate-700 transition-all">+ Add Case</button>
               <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl text-xs shadow-lg transition-all">Finalize Problem</button>
            </div>
          </form>
          <div className="mt-10 border-t border-slate-800 pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contest.problemBank.map(p => (
              <div key={p.id} className="p-5 bg-slate-950 border border-slate-800 rounded-[1.5rem] flex items-center justify-between group hover:border-slate-600 transition-all">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white truncate max-w-[120px]">{p.title}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase">{p.difficulty}</span>
                </div>
                <button onClick={() => onDeleteProblem(p.id)} className="text-rose-500/30 group-hover:text-rose-500 transition-all p-2"><Icons.XCircle /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeOverlay === 'setup' && (
        <div className="bg-slate-900 border border-amber-500/30 p-8 rounded-[2rem] shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Icons.Lock /></div>
              Production System Setup
            </h3>
            <button onClick={() => setActiveOverlay('none')} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors">&times;</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Environment Status</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Database Connection:</span>
                    <span className="text-emerald-400 font-bold">Authenticated</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Persistence Mode:</span>
                    <span className="text-indigo-400 font-bold">SQL Managed</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">AI Evaluator:</span>
                    <span className="text-emerald-400 font-bold">Online</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl">
                <p className="text-xs text-amber-500/80 leading-relaxed italic">
                  Note: The server automatically initializes these tables if they do not exist. Use the schema on the right for manual validation or migrations.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PostgreSQL Schema</h4>
              <pre className="bg-slate-950 p-6 rounded-3xl text-[10px] text-indigo-300 mono overflow-x-auto border border-slate-800 leading-relaxed max-h-[400px]">
                {sqlSchema}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Enrolled Teams" value={teams.length.toString()} icon={<Icons.Users />} />
        <StatCard title="Total Submissions" value={submissions.length.toString()} icon={<Icons.Code />} />
        <StatCard title="Proctor Alerts" value={totalViolations.toString()} icon={<Icons.Lock />} color={totalViolations > 5 ? "text-rose-500" : "text-emerald-500"} />
        <StatCard title="System Mode" value={contest.status} icon={<Icons.Timer />} color="text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
              <h3 className="text-xl font-black text-white flex items-center gap-3"><Icons.Code /> Submission Stream</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monitoring</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="py-6 px-8">Team</th>
                    <th className="py-6 px-4 text-center">Score</th>
                    <th className="py-6 px-4 text-center">Quality</th>
                    <th className="py-6 px-8 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {submissions.sort((a,b) => b.timestamp - a.timestamp).map((s) => {
                    const team = teams.find(t => t.id === s.teamId);
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-all group">
                        <td className="py-6 px-8 font-bold text-slate-200">{team?.name || 'Unknown'}</td>
                        <td className="py-6 px-4 text-center"><span className="px-3 py-1 bg-slate-800 text-emerald-400 rounded-lg font-black">{s.score}%</span></td>
                        <td className="py-6 px-4 text-center"><span className="text-indigo-400 font-black">{s.aiScore || 0}%</span></td>
                        <td className="py-6 px-8 text-right">
                          <button onClick={() => setSelectedSubmission(s)} className="text-[10px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest transition-all">Review Logic</button>
                        </td>
                      </tr>
                    );
                  })}
                  {submissions.length === 0 && (
                    <tr><td colSpan={4} className="py-20 text-center text-slate-600 font-medium italic">Waiting for activity...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-800 bg-indigo-600/5">
            <h3 className="text-xl font-black text-white flex items-center gap-3"><Icons.Trophy /> Leaderboard</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {teams.sort((a,b) => b.totalScore - a.totalScore).map((team, idx) => (
              <div key={team.id} className={`flex items-center gap-4 p-5 rounded-3xl border ${idx === 0 ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-950/50 border-slate-800/50'}`}>
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-black ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{idx + 1}</div>
                <div className="flex-1">
                  <p className="font-black text-white text-sm">{team.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Flags: {team.violations || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">{team.totalScore}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-2xl font-black text-white">Logic Audit: {selectedSubmission.id}</h4>
              <button onClick={() => setSelectedSubmission(null)} className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-full text-white">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
              <pre className="bg-slate-950 p-8 rounded-[2rem] text-xs text-indigo-300 mono whitespace-pre-wrap">{selectedSubmission.code}</pre>
              <div className="space-y-8">
                <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem]">
                  <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">AI Feedback</h5>
                  <p className="text-slate-200 italic leading-relaxed text-sm">"{selectedSubmission.aiFeedback}"</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Score</span>
                    <span className="text-3xl font-black text-emerald-400">{selectedSubmission.score}%</span>
                  </div>
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Quality</span>
                    <span className="text-3xl font-black text-indigo-400">{selectedSubmission.aiScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color?: string }> = ({ title, value, icon, color = "text-white" }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex items-center gap-6 hover:border-slate-700 transition-all shadow-xl">
    <div className="p-5 bg-slate-950 rounded-2xl text-slate-400 border border-slate-800 shadow-inner">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-3xl font-black ${color} tracking-tight`}>{value}</p>
    </div>
  </div>
);

export default AdminDashboard;
