import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ user, children }) {
  // If user exists, render the children (Dashboard, etc.)
  // Otherwise, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
