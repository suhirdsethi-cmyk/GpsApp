import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TrackingProvider, useTracking } from './context/TrackingContext';

// Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import NotificationToast from './components/NotificationToast';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LiveTracking from './pages/LiveTracking';
import Connections from './pages/Connections';
import TrackingHistory from './pages/TrackingHistory';
import Profile from './pages/Profile';

// Protected Layout wrapper
const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();
  const { toastMessage } = useTracking();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <BottomNav />
      {toastMessage && <NotificationToast message={toastMessage} />}
    </div>
  );
};

// Public Route wrapper
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <TrackingProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/map" element={<ProtectedLayout><LiveTracking /></ProtectedLayout>} />
            <Route path="/connections" element={<ProtectedLayout><Connections /></ProtectedLayout>} />
            <Route path="/history" element={<ProtectedLayout><TrackingHistory /></ProtectedLayout>} />
            <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </TrackingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
