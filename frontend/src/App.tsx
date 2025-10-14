// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import RoomView from './components/room/RoomView';
import ProtectedRoute from './components/auth/ProtectedRoute';
import sessionService from './services/sessionService';

const App: React.FC = () => {
  useEffect(() => {
    console.log('App mounted, attempting session recovery...');
    
    // Try to recover session on app startup with a small delay
    // to ensure components are ready
    const timer = setTimeout(() => {
      const recovered = sessionService.initializeSession();
      console.log('Session recovery result:', recovered);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/room"
          element={
            <ProtectedRoute>
              <RoomView />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;