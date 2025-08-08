// src/components/room/Room.tsx
import React, { useEffect } from 'react';
import socketService from '../../services/socketService';

const Room: React.FC = () => {
  useEffect(() => {
    // In a real app, you'd get this from a form or URL
    const username = `User_${Math.random().toString(36).substring(7)}`;
    const roomName = 'main-room';
    
    socketService.connect();
    socketService.joinRoom(username, roomName);

    // Set current user - in a real app, the server would confirm this
    // For now, we'll wait for the first room_update
    
    return () => {
      socketService.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything itself
};

export default Room;
