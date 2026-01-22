import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../state/AuthContext.jsx';

export default function RequireRole({ role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/app" replace />;

  return <Outlet />;
}
