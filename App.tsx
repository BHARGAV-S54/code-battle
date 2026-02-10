
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, ContestStatus, ContestState, Team, Problem, Submission } from './types';
import { INITIAL_PROBLEMS, Icons } from './constants';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import TeamBattleground from './components/TeamBattleground';

const VIOLATION_PENALTY = 5;
const STORAGE_KEY = 'CODE_BATTLE_LOCAL_FALLBACK';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ id: string; role: UserRole; name: string } | null>(null);
  const [contest, setContest] = useState<ContestState>({ status: ContestStatus.LOCKED, durationMinutes: 60, problemBank: INITIAL_PROBLEMS });
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Helper to load from LocalStorage for local mode
  const loadLocalData = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.contest) setContest(parsed.contest);
        if (parsed.teams) setTeams(parsed.teams);
        if (parsed.submissions) setSubmissions(parsed.submissions);
      } catch (e) {
        console.error("Failed to parse local storage data", e);
      }
    }
  }, []);

  // Helper to save to LocalStorage for local mode
  const saveLocalData = useCallback((newContest: ContestState, newTeams: Team[], newSubmissions: Submission[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      contest: newContest,
      teams: newTeams,
      submissions: newSubmissions
    }));
  }, []);

  // Sync state with server
  const syncState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      
      if (!res.ok) {
        if (res.status === 404) {
          // If 404, we are likely in a static-only environment (preview)
          if (!isLocalMode) {
            setIsLocalMode(true);
            loadLocalData();
          }
          return;
        }
        setSyncError(`Sync Error: ${res.status} ${res.statusText}`);
        return;
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setSyncError("Sync failed: Received non-JSON response from server.");
        return;
      }

      const data = await res.json();
      setSyncError(null);
      setIsLocalMode(false);
      
      if (!data.contest || !data.contest.problemBank || data.contest.problemBank.length === 0) {
        if (data.contest) data.contest.problemBank = INITIAL_PROBLEMS;
      }
      
      if (data.contest) setContest(data.contest);
      if (data.teams) setTeams(data.teams);
      if (data.submissions) setSubmissions(data.submissions);
    } catch (err) {
      console.error("Critical state sync error:", err);
      // Fallback to local data on network failure
      if (!isLocalMode) {
        setIsLocalMode(true);
        loadLocalData();
      }
    }
  }, [isLocalMode, loadLocalData]);

  useEffect(() => {
    syncState().finally(() => setIsLoading(false));
  }, []);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(syncState, 5000);
    return () => clearInterval(interval);
  }, [syncState]);

  const handleLogin = (id: string, role: UserRole, name: string) => {
    setCurrentUser({ id, role, name });
  };

  const handleLogout = () => setCurrentUser(null);

  const handleCreateTeam = async (name: string, password: string) => {
    const newTeam: Team = {
      id: name.toLowerCase().replace(/\s/g, '-'),
      name,
      password,
      members: [],
      totalScore: 0,
      violations: 0
    };

    if (isLocalMode) {
      const updatedTeams = [...teams.filter(t => t.id !== newTeam.id), newTeam];
      setTeams(updatedTeams);
      saveLocalData(contest, updatedTeams, submissions);
      return;
    }

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      });
      if (!res.ok) throw new Error('Server error on team creation');
      const saved = await res.json();
      setTeams(prev => [...prev.filter(t => t.id !== saved.id), saved]);
    } catch (err) {
      alert("Failed to register team. Switching to Local Mode for this session.");
      setIsLocalMode(true);
      const updatedTeams = [...teams.filter(t => t.id !== newTeam.id), newTeam];
      setTeams(updatedTeams);
      saveLocalData(contest, updatedTeams, submissions);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (isLocalMode) {
      const updatedTeams = teams.filter(t => t.id !== id);
      setTeams(updatedTeams);
      saveLocalData(contest, updatedTeams, submissions);
      return;
    }

    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTeams(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error("Team deletion error:", err);
    }
  };

  const handleAddProblem = async (problem: Problem) => {
    if (isLocalMode) {
      const updatedContest = { ...contest, problemBank: [...contest.problemBank.filter(p => p.id !== problem.id), problem] };
      setContest(updatedContest);
      saveLocalData(updatedContest, teams, submissions);
      return;
    }

    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem)
      });
      if (!res.ok) throw new Error('Failed to add problem');
      const saved = await res.json();
      setContest(prev => ({ ...prev, problemBank: [...prev.problemBank.filter(p => p.id !== saved.id), saved] }));
    } catch (err) {
      console.error("Problem add error:", err);
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (confirm("Delete this problem?")) {
      if (isLocalMode) {
        const updatedContest = { ...contest, problemBank: contest.problemBank.filter(p => p.id !== id) };
        setContest(updatedContest);
        saveLocalData(updatedContest, teams, submissions);
        return;
      }

      try {
        const res = await fetch(`/api/problems/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setContest(prev => ({ ...prev, problemBank: prev.problemBank.filter(p => p.id !== id) }));
        }
      } catch (err) {
        console.error("Problem delete error:", err);
      }
    }
  };

  const startContest = async (duration: number) => {
    const update = {
      status: ContestStatus.ACTIVE,
      startTime: Date.now(),
      durationMinutes: duration
    };
    
    const bank = contest.problemBank.length ? contest.problemBank : INITIAL_PROBLEMS;
    const updatedTeams = teams.map(team => {
      const randomProblem = bank[Math.floor(Math.random() * bank.length)];
      return { ...team, assignedProblemId: randomProblem.id, totalScore: 0, violations: 0 };
    });

    if (isLocalMode) {
      const updatedContest = { ...contest, ...update };
      setContest(updatedContest);
      setTeams(updatedTeams);
      setSubmissions([]);
      saveLocalData(updatedContest, updatedTeams, []);
      return;
    }

    try {
      await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });

      for (const team of updatedTeams) {
        await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(team)
        });
      }

      setContest(prev => ({ ...prev, ...update }));
      setTeams(updatedTeams);
      setSubmissions([]);
      syncState();
    } catch (err) {
      alert("Error starting contest via API. Switching to Local Simulation.");
      setIsLocalMode(true);
    }
  };

  const stopContest = async () => {
    if (isLocalMode) {
      const updatedContest = { ...contest, status: ContestStatus.FINISHED };
      setContest(updatedContest);
      saveLocalData(updatedContest, teams, submissions);
      return;
    }

    try {
      await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: ContestStatus.FINISHED })
      });
      setContest(prev => ({ ...prev, status: ContestStatus.FINISHED }));
    } catch (err) {
      console.error("Contest stop error:", err);
    }
  };

  const addSubmission = async (submission: Submission) => {
    if (isLocalMode) {
      const updatedSubmissions = [...submissions, submission];
      setSubmissions(updatedSubmissions);
      
      const updatedTeams = teams.map(t => {
        if (t.id === submission.teamId) {
          return { ...t, totalScore: Math.max(t.totalScore, submission.score), lastSubmissionTime: submission.timestamp };
        }
        return t;
      });
      setTeams(updatedTeams);
      saveLocalData(contest, updatedTeams, updatedSubmissions);
      return;
    }

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      if (!res.ok) throw new Error('Submission save failed');
      const saved = await res.json();
      setSubmissions(prev => [...prev, saved]);
      syncState(); 
    } catch (err) {
      console.error("Submission error:", err);
    }
  };

  const handleAddViolation = async (teamId: string) => {
    if (isLocalMode) {
      const updatedTeams = teams.map(t => t.id === teamId ? { ...t, violations: (t.violations || 0) + 1 } : t);
      setTeams(updatedTeams);
      saveLocalData(contest, updatedTeams, submissions);
      return;
    }

    try {
      const res = await fetch(`/api/violations/${teamId}`, { method: 'POST' });
      if (res.ok) {
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, violations: (t.violations || 0) + 1 } : t));
      }
    } catch (err) {
      console.error("Violation log error:", err);
    }
  };

  const resetAllData = async () => {
    if (confirm("PURGE WARNING: Permanent deletion of all session data?")) {
      if (isLocalMode) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
        return;
      }
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        if (res.ok) {
          window.location.reload();
        }
      } catch (err) {
        console.error("Reset error:", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Initializing Battle Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {syncError && (
        <div className="bg-rose-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 sticky top-0 z-[200]">
          <Icons.XCircle />
          {syncError}
        </div>
      )}
      
      {isLocalMode && !syncError && (
        <div className="bg-indigo-600/20 text-indigo-400 px-6 py-1 text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 sticky top-0 z-[200] border-b border-indigo-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Running in Local Mode (Backend Unreachable)
        </div>
      )}

      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20">
            <Icons.Code />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Code<span className="text-indigo-500">Battle</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">v2.1 Production Resilient</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{currentUser.role}</span>
              <span className="text-sm font-bold text-slate-200">{currentUser.name}</span>
            </div>
            <button onClick={handleLogout} className="p-2.5 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 transition-all"><Icons.Logout /></button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden relative">
        {!currentUser ? (
          <LoginPage onLogin={handleLogin} teams={teams} />
        ) : currentUser.role === UserRole.ADMIN ? (
          <AdminDashboard 
            contest={contest} teams={teams} submissions={submissions}
            onStart={startContest} onStop={stopContest}
            onCreateTeam={handleCreateTeam} onDeleteTeam={handleDeleteTeam}
            onAddProblem={handleAddProblem} onDeleteProblem={handleDeleteProblem}
          />
        ) : (
          <TeamBattleground 
            team={teams.find(t => t.id === currentUser.id) || teams[0]}
            contest={contest}
            problem={contest.problemBank.find(p => p.id === teams.find(t => t.id === currentUser.id)?.assignedProblemId) || INITIAL_PROBLEMS[0]}
            submissions={submissions.filter(s => s.teamId === currentUser.id)}
            onAddSubmission={addSubmission}
            onViolation={() => handleAddViolation(currentUser.id)}
          />
        )}
        
        {currentUser?.role === UserRole.ADMIN && (
          <button onClick={resetAllData} className="fixed bottom-4 left-4 p-2 text-[10px] font-black text-rose-500/50 hover:text-rose-500 uppercase tracking-widest z-[200]">Purge Arena</button>
        )}
      </main>
    </div>
  );
};

export default App;
