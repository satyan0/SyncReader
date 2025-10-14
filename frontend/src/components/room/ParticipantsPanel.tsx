// src/components/room/ParticipantsPanel.tsx
import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { User, ChevronRight, FileText, Upload } from 'lucide-react';
import socketService from '../../services/socketService';

const ParticipantsPanel: React.FC = () => {
  const users = useStore((state) => state.room?.users);
  const documents = useStore((state) => state.room?.documents);
  const currentUser = useStore((state) => state.currentUser);
  const roomName = useStore((state) => state.room?.name);
  const roomState = useStore((state) => state.room); // Subscribe to entire room state
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  // Debug logging for documents in participants panel
  React.useEffect(() => {
    console.log('ParticipantsPanel re-rendered. Documents:', documents?.length || 0);
    if (documents) {
      documents.forEach(doc => {
        console.log(`Document: ${doc.name} by user ${doc.uploader_id}`);
      });
    }
  }, [documents, roomState]);

  // Function to get color based on user ID (same as in DocumentViewer)
  const getUserHighlightColor = (userId: string) => {
    const colors = [
      'border-yellow-400',
      'border-blue-400', 
      'border-green-400',
      'border-red-400',
      'border-purple-400',
      'border-pink-400',
      'border-indigo-400',
      'border-orange-400'
    ];
    
    // Use a simple hash to consistently assign colors to users
    const hash = userId.toString().split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Function to get documents uploaded by a specific user
  const getDocumentsByUser = (userId: string) => {
    return documents?.filter(doc => doc.uploader_id === userId) || [];
  };

  // Function to toggle user expansion
  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  // File upload handlers
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    console.log('File details:', file ? { name: file.name, size: file.size, type: file.type } : 'No file');
    console.log('Room name:', roomName);
    console.log('Current user:', currentUser);
    
    if (!file) {
      console.error('No file selected');
      alert('Please select a PDF file to upload');
      return;
    }
    
    if (!roomName) {
      console.error('No room name available');
      alert('Room not found. Please try joining the room again.');
      return;
    }
    
    console.log('Attempting to upload file:', file.name, 'to room:', roomName);
    setIsUploading(true);
    try {
      const result = await socketService.uploadFile(file, roomName);
      console.log('Upload successful:', result);
      // The room_update event will automatically update the UI
    } catch (error) {
      console.error('Upload failed:', error);
      // You could add a toast notification here
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
    
    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  const handleUploadClick = () => {
    document.getElementById('file-upload')?.click();
  };

  // Document selection handler
  const handleDocumentClick = (docId: string) => {
    socketService.setView(docId, 0);
  };

  return (
    <div className="h-full p-3 sm:p-4 flex flex-col">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">Participants</h2>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf"
        />
        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className={`w-full flex items-center justify-center p-2 sm:p-2.5 rounded-lg transition-colors text-sm sm:text-base ${
            isUploading 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
              <span className="font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="font-medium">Upload PDF</span>
            </>
          )}
        </button>
      </div>
      
      {!users ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-1">
          {users.map((user) => {
            const userDocuments = getDocumentsByUser(user.id);
            const isExpanded = expandedUsers.has(user.id);
            const isCurrentUser = user.id === currentUser?.id;
            const borderColor = getUserHighlightColor(user.id);
            
            return (
              <div key={user.id} className="group/collapsible">
                {/* Participant Header */}
                <div
                  className={`flex items-center p-2 sm:p-2.5 rounded-lg space-x-2 sm:space-x-3 cursor-pointer transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => toggleUserExpansion(user.id)}
                >
                  {/* Color indicator */}
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 ${borderColor} flex-shrink-0`} />
                  
                  {/* User icon */}
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${isCurrentUser ? 'bg-blue-500' : 'bg-slate-100'}`}>
                    <User className={`w-3 h-3 sm:w-4 sm:h-4 ${
                      isCurrentUser ? 'text-white' : 'text-slate-500'
                    }`} />
                  </div>
                  
                  {/* Username */}
                  <div className={`text-xs sm:text-sm font-medium flex-1 min-w-0 ${
                    isCurrentUser ? 'text-white' : 'text-slate-700'
                  }`}>
                    <div className="break-words leading-relaxed">{user.username}</div>
                    {isCurrentUser && <div className="text-xs opacity-80 break-words">(You)</div>}
                  </div>
                  
                  {/* Document count */}
                  {userDocuments.length > 0 && (
                    <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0 ${
                      isCurrentUser 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {userDocuments.length}
                    </span>
                  )}
                  
                  {/* Chevron icon */}
                  <ChevronRight 
                    className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 flex-shrink-0 ${
                      isExpanded ? 'rotate-90' : ''
                    } ${isCurrentUser ? 'text-white' : 'text-slate-400'}`} 
                  />
                </div>
                
                {/* Collapsible Content - Documents */}
                {isExpanded && userDocuments.length > 0 && (
                  <div className="ml-4 sm:ml-8 mt-1 space-y-1">
                    {userDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center p-2 rounded-md space-x-2 cursor-pointer transition-colors ${
                          isCurrentUser
                            ? 'hover:bg-blue-500/20'
                            : 'hover:bg-slate-100'
                        }`}
                        onClick={() => handleDocumentClick(doc.id)}
                      >
                        <FileText className={`w-3 h-3 sm:w-4 sm:h-4 ${
                          isCurrentUser ? 'text-blue-300' : 'text-slate-600'
                        }`} />
                        <div className={`text-xs sm:text-sm flex-1 min-w-0 ${
                          isCurrentUser ? 'text-blue-200' : 'text-slate-800'
                        }`}>
                          <div className="break-words leading-relaxed">{doc.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Empty state for users with no documents */}
                {isExpanded && userDocuments.length === 0 && (
                  <div className="ml-8 mt-1 p-2">
                    <span className={`text-xs ${
                      isCurrentUser ? 'text-blue-200' : 'text-slate-400'
                    }`}>
                      No documents uploaded
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ParticipantsPanel;