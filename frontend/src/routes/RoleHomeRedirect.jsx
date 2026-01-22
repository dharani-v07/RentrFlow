import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../state/AuthContext.jsx';

export default function RoleHomeRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return user.role === 'agent'
    ? <Navigate to="/app/agent/dashboard" replace />
    : <Navigate to="/app/contractor/dashboard" replace />;
}
