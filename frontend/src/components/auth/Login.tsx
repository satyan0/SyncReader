// src/components/auth/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../../services/socketService';
import sessionService from '../../services/sessionService';
import useStore from '../../store/useStore';
import { FileText } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Connect socket and join room
      socketService.connect();
      socketService.joinRoom(username, roomName);

      // Create session
      sessionService.createSession(username, roomName);

      // Wait for room update before navigating
      const connectionPromise = new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          const currentRoom = useStore.getState().room;
          console.log('Checking room state:', currentRoom);
          if (currentRoom && currentRoom.users && currentRoom.users.length > 0) {
            console.log('Room update detected, navigating to room');
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      await connectionPromise;
      console.log('Login successful, navigating to room');
      navigate('/room');
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-2" />
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">CourtSync</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 break-words leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label 
                htmlFor="username" 
                className="block text-sm font-medium text-slate-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label 
                htmlFor="room" 
                className="block text-sm font-medium text-slate-700"
              >
                Room Name
              </label>
              <input
                id="room"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !roomName}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg
                       hover:bg-blue-700 focus:outline-none focus:ring-2 
                       focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors text-base font-medium"
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;