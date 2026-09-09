import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password, confirmPassword);
      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.detail || "Registration failed. Email might already exist.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/10 shadow-2xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/20">
            <Shield className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold font-outfit text-white tracking-tight">Create Account</h1>
          <p className="text-sm text-slate-400 mt-1">Start consensual location sharing securely</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Full Name</label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-brand-500/20 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
