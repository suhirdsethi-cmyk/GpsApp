import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navigation, MapPin, Users, Clock, User, LogOut, Menu, X, Shield, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { myActiveSession, stopSharing } = useTracking();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Navigation },
    { name: 'Live Map', path: '/map', icon: MapPin },
    { name: 'Connections', path: '/connections', icon: Users },
    { name: 'History', path: '/history', icon: Clock },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-outfit font-bold text-lg text-white tracking-wide">GPS Guard</span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-emerald-400">Consensual Share</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-slate-800 text-brand-500 font-semibold shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-500' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Active Session Status & User Action */}
          <div className="hidden md:flex items-center gap-3">
            {myActiveSession && myActiveSession.status === 'ACTIVE' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Sharing Active</span>
                <button
                  onClick={() => stopSharing()}
                  className="ml-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <span className="text-sm font-medium text-slate-200">{user?.name}</span>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {myActiveSession && myActiveSession.status === 'ACTIVE' && (
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl px-4 pt-2 pb-4 space-y-1">
          <div className="pb-2 mb-2 border-b border-slate-800 flex items-center justify-between text-sm text-slate-400">
            <span>Signed in as <strong className="text-white">{user?.name}</strong></span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-rose-400 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  active ? 'bg-brand-500/10 text-brand-500 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
