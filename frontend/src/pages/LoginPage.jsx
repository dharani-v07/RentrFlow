import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../state/AuthContext.jsx';

function cx(...xs) {
  return xs.filter(Boolean).join(' ');
}

export default function LoginPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const initialRole = useMemo(() => {
    return role === 'agent' || role === 'contractor' ? role : 'agent';
  }, [role]);

  const [activeRole, setActiveRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setActiveRole(initialRole);
  }, [initialRole]);

  function toggle(nextRole) {
    setError('');
    setActiveRole(nextRole);
    navigate(`/login/${nextRole}`, { replace: true });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ role: activeRole, email, password, rememberMe });
      navigate('/app', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const isAgent = activeRole === 'agent';

  return (
    <div className="min-h-full relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center blur-[4px] scale-110"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop')",
        }}
      />
      <div className="absolute inset-0 bg-[rgba(0,30,60,0.4)]" />

      <div className="relative min-h-full flex flex-col items-center justify-center px-4 py-10">
        <header className="text-center text-white mb-7">
          <h1 className="text-4xl font-bold drop-shadow">Agent-Contractor Portal</h1>
          <p className="mt-2 text-white/90 drop-shadow">Connecting Agents with Contractors</p>
        </header>

        <div
          className="relative w-[300px] bg-black/50 border border-white/30 rounded-full p-[5px] flex items-center select-none mb-7"
        >
          <div
            className={cx(
              'absolute top-[5px] h-[calc(100%-10px)] w-[calc(50%-5px)] rounded-full bg-[#1e5aa0] transition-all duration-300',
              isAgent ? 'left-[5px]' : 'left-[calc(50%+5px)]'
            )}
          />
          <button
            type="button"
            onClick={() => toggle('agent')}
            className="relative z-10 flex-1 text-center text-white font-semibold text-sm py-2"
          >
            Agent Login
          </button>
          <button
            type="button"
            onClick={() => toggle('contractor')}
            className="relative z-10 flex-1 text-center text-white font-semibold text-sm py-2"
          >
            Contractor Login
          </button>
        </div>

        <div className="w-[350px]">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="text-center pb-3 mb-6 border-b border-slate-100">
              <h2 className="text-2xl font-semibold text-slate-800">
                <span className={cx(isAgent ? 'text-[#1e5aa0]' : 'text-slate-800')}>
                  {isAgent ? 'Agent' : 'Contractor'}
                </span>{' '}
                Login
              </h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-md pl-11 pr-3 py-3 outline-none focus:border-slate-400"
                />
              </div>

              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-md pl-11 pr-3 py-3 outline-none focus:border-slate-400"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember Me
              </label>

              <button
                type="submit"
                disabled={submitting}
                className={cx(
                  'w-full py-3 rounded-md text-white font-bold transition-opacity disabled:opacity-60',
                  isAgent ? 'bg-[#1e5aa0] hover:opacity-90' : 'bg-[#e65100] hover:opacity-90'
                )}
              >
                {submitting ? 'Logging in...' : 'Login'}
              </button>

              <button
                type="button"
                onClick={() => setError('Password reset is not enabled for this demo build.')}
                className={cx(
                  'block w-full text-center text-sm mt-2',
                  isAgent ? 'text-[#1e5aa0]' : 'text-[#1e5aa0]'
                )}
              >
                Forgot Password?
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 text-center text-white drop-shadow">
          <p className="mb-2">New to the platform?</p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link className="underline font-medium" to="/register/agent">
              Register as an Agent
            </Link>
            <div className="h-5 w-px bg-white/50" />
            <Link className="underline font-medium" to="/register/contractor">
              Register as a Contractor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
