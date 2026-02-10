
import React, { useState } from 'react';
import { UserRole, Team } from '../types';
import { Icons } from '../constants';

interface LoginPageProps {
  onLogin: (id: string, role: UserRole, name: string) => void;
  teams: Team[];
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, teams }) => {
  const [role, setRole] = useState<UserRole>(UserRole.TEAM);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === UserRole.ADMIN) {
      if (identifier === 'admin' && password === 'bhargav') {
        onLogin('admin-root', UserRole.ADMIN, 'Root Admin');
      } else {
        setError('Invalid admin credentials.');
      }
    } else {
      const team = teams.find(t => t.name.toLowerCase() === identifier.toLowerCase() || t.id === identifier.toLowerCase());
      if (team && team.password === password) {
        onLogin(team.id, UserRole.TEAM, team.name);
      } else if (!team) {
        setError('Team not found. Please contact the administrator.');
      } else {
        setError('Incorrect password for this team.');
      }
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-indigo-600/20 rounded-full text-indigo-400 mb-4 animate-pulse">
            <Icons.Trophy />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Access Battleground</h2>
          <p className="text-slate-400 text-sm">Enter your credentials to join the arena</p>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-xl mb-8">
          <button 
            type="button"
            onClick={() => setRole(UserRole.TEAM)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${role === UserRole.TEAM ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Team Participant
          </button>
          <button 
            type="button"
            onClick={() => setRole(UserRole.ADMIN)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${role === UserRole.ADMIN ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Admin Controller
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              {role === UserRole.ADMIN ? 'Admin Identifier' : 'Team Name / ID'}
            </label>
            <input 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder={role === UserRole.ADMIN ? "Enter admin ID..." : "Enter team name..."}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/50 text-rose-400 text-xs rounded-lg text-center animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Initialize Interface
            <Icons.ArrowRight />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
