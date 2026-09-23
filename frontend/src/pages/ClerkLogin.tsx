import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerkAuthService } from '@/services/firebase/clerkAuthService';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, UserCheck, KeyRound, Building2 } from 'lucide-react';

export const ClerkLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('Central RTI Routing & Grievance Division');
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await clerkAuthService.login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('Access Denied')) {
        setError(err.message);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('Invalid officer credentials. Check your email or use 1-Click Demo Login.');
      } else {
        setError(err.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !employeeId) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await clerkAuthService.registerClerk({
        name,
        email,
        password,
        employeeId,
        department,
        state,
        district,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Officer registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setDemoLoading(true);
      setError(null);
      await clerkAuthService.loginAsDemoClerk();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Could not connect demo officer account: ' + err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email above to receive password reset instructions.');
      return;
    }
    try {
      await clerkAuthService.resetPassword(email);
      setInfoMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Could not send reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Emblem / Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 border border-blue-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          RTI Sathi
        </h1>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-blue-400">
          Clerk & Routing Officer Portal
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Authorized Government Human-in-the-Loop Routing Terminal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          {/* Quick Demo Button */}
          <div className="mb-6">
            <button
              onClick={handleDemoLogin}
              disabled={demoLoading || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {demoLoading ? 'Logging into Demo Terminal...' : '1-Click Demo Officer Login (Sanjay Deshmukh)'}
              </span>
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-1.5">
              Instant login as authorized Routing Officer (RO-MH-40192)
            </p>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                Or Sign In with Official ID
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {infoMessage}
            </div>
          )}

          {!isRegistering ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="clerk.officer@rtisathi.gov.in"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Review Terminal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Officer Registration Form */
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Officer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="r.patil@gov.in"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="RO-MH-1029"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Cell / Department
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg shadow-sm text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors mt-2"
              >
                {loading ? 'Registering Officer...' : 'Create Officer Profile'}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {isRegistering
                ? 'Already have an officer account? Sign In'
                : 'Need a new routing officer account? Register here'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <span>RTI Black Hole Solution • Restricted Access for Routing Officers Only</span>
        </div>
      </div>
    </div>
  );
};
