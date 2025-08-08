// src/components/layout/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LogOut } from 'lucide-react';
import useStore from '../../store/useStore';
import sessionService from '../../services/sessionService';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const room = useStore((state) => state.room);
  const currentUser = useStore((state) => state.currentUser);

  const handleLogout = () => {
    sessionService.clearSession();
    navigate('/login');
  };

  return (
    <header className="h-12 sm:h-14 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
        <h1 className="text-lg sm:text-xl font-semibold text-slate-800 break-words">CourtSync</h1>
        {room && (
          <span className="text-xs sm:text-sm text-slate-500 ml-2 sm:ml-4 break-words hidden sm:block">
            Room: {room.name}
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        {currentUser && (
          <span className="text-xs sm:text-sm text-slate-600 break-words max-w-20 sm:max-w-none">
            {currentUser.username}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="p-1.5 sm:p-2 text-slate-600 hover:text-red-600 rounded-lg
                   hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;