// src/components/auth/ProtectedRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import sessionService from '../../services/sessionService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const currentUser = useStore((state) => state.currentUser);
  const room = useStore((state) => state.room);
  const [isInitializing, setIsInitializing] = useState(true);
  const [, setSessionRecovered] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      console.log('ProtectedRoute: Checking session...');
      
      // If we already have a valid session, no need to recover
      if (currentUser && room) {
        console.log('ProtectedRoute: Valid session found');
        setSessionRecovered(true);
        setIsInitializing(false);
        return;
      }

      console.log('ProtectedRoute: Attempting session recovery...');
      // Try to recover session
      const recovered = sessionService.initializeSession();
      console.log('ProtectedRoute: Session recovery result:', recovered);
      setSessionRecovered(recovered);
      
      // Wait a bit longer for socket connection and room updates
      setTimeout(() => {
        setIsInitializing(false);
      }, 1000);
    };

    initializeSession();
  }, [currentUser, room]);

  // Show loading while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-slate-600">Restoring session...</div>
        </div>
      </div>
    );
  }

  // Check if session is valid after recovery attempt
  if (!sessionService.isSessionValid()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;