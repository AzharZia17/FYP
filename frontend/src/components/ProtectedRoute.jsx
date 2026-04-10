import { Navigate } from 'react-router-dom';

/**
 * A wrapper component that strictly checks for an active authentication token.
 * Route users dynamically to the login workflow if unauthorized.
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Graceful redirection to auth gating if unauthenticated
    return <Navigate to="/login" replace />;
  }
  
  // Render children structure natively safely
  return children;
};

export default ProtectedRoute;
