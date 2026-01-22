import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { register } from '../services/authService';
import { useAuth } from '../state/AuthContext.jsx';

export default function RegisterPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { setSession, refreshMe } = useAuth();

  const normalizedRole = useMemo(() => {
    return role === 'agent' || role === 'contractor' ? role : 'agent';
  }, [role]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await register({ role: normalizedRole, name, email, password, phone, companyName });
      setSession({ token: data.token, user: data.user, rememberMe: true });
      await refreshMe().catch(() => null);
      navigate('/app', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl overflow-hidden shadow-xl bg-white">
          <div className="p-6 bg-slate-900 text-white">
            <div className="text-xl font-semibold">Create {normalizedRole} account</div>
            <div className="text-sm opacity-90">For demo and hackathon evaluation</div>
          </div>

          <form className="p-6 space-y-4" onSubmit={onSubmit}>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div>
              <label className="text-sm text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-700">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="text-sm text-slate-700">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-700">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700">Company</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create account'}
            </button>

            <div className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to={`/login/${normalizedRole}`} className="text-slate-900 font-medium">Login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
