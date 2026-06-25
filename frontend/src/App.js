import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import Home from './components/Home';
import Events from './components/Events';
import Conge from './components/conge';
import CongeApprovals from './components/CongeApprovals';
import EventAdd from './components/EventAdd';
import EventDetails from './components/EventDetails';
import EmployersAdmin from './components/EmployersAdmin';
import EmployerAdd from './components/EmployerAdd';
import Profile from './components/Profile';
import Team from './components/Team';
import Holidays from './components/Holidays';
import Help from './components/Help';
import { AuthProvider, useAuth } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/conge" element={<ProtectedRoute><Conge /></ProtectedRoute>} />
        <Route path="/conge/validations" element={<ProtectedRoute><CongeApprovals /></ProtectedRoute>} />
        <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/event/add" element={<ProtectedRoute><EventAdd /></ProtectedRoute>} />
        <Route path="/event/:id/edit" element={<ProtectedRoute><EventAdd /></ProtectedRoute>} />
        <Route path="/event/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
        <Route path="/holidays" element={<ProtectedRoute><Holidays /></ProtectedRoute>} />
        <Route path="/aide" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/employers" element={<EmployeesRoute><EmployersAdmin /></EmployeesRoute>} />
        <Route path="/employers/new" element={<AdminRoute><EmployerAdd /></AdminRoute>} />
        <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, forcePasswordChange, isSessionLoading } = useAuth();
  const location = useLocation();

  if (isSessionLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (forcePasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!forcePasswordChange && location.pathname === '/change-password') {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, forcePasswordChange, isSessionLoading } = useAuth();
  const location = useLocation();

  if (isSessionLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (forcePasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return isAdmin ? children : <Navigate to="/home" replace />;
}

function EmployeesRoute({ children }) {
  const { isAuthenticated, canAccessEmployeesDirectory, forcePasswordChange, isSessionLoading } = useAuth();
  const location = useLocation();

  if (isSessionLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (forcePasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return canAccessEmployeesDirectory ? children : <Navigate to="/home" replace />;
}

export default App;
