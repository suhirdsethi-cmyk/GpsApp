import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navigation, MapPin, Users, Clock, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Navigation },
    { name: 'Live Map', path: '/map', icon: MapPin },
    { name: 'Friends', path: '/connections', icon: Users },
    { name: 'History', path: '/history', icon: Clock },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              active
                ? 'text-brand-400 font-semibold bg-brand-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-brand-400' : 'text-slate-400'}`} />
            <span className="text-[10px] tracking-tight">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
