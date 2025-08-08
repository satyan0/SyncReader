// src/components/room/RoomView.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import ParticipantsPanel from './ParticipantsPanel';
import DocumentViewer from '../document/DocumentViewer';
import ActivityPanel from '../activity/ActivityPanel';
import useStore from '../../store/useStore';
import sessionService from '../../services/sessionService';

const RoomView: React.FC = () => {
  const navigate = useNavigate();
  const room = useStore((state) => state.room);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Refresh session on user activity
    const handleUserActivity = () => {
      sessionService.refreshSession();
    };

    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!room) {
      navigate('/login');
    }
  }, [room, navigate]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-full sm:w-80 flex-shrink-0">
          <ParticipantsPanel />
        </div>
        <main className="flex-1 flex flex-col overflow-hidden">
          <DocumentViewer />
        </main>
        <ActivityPanel />
      </div>
    </div>
  );
};

export default RoomView;