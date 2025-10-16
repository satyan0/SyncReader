// src/components/document/DocumentsPanel.tsx
import React from 'react';
import useStore from '../../store/useStore';
import { Upload, File } from 'lucide-react';
import socketService from '../../services/socketService';

const DocumentsPanel: React.FC = () => {
  const documents = useStore((state) => state.room?.documents);
  const roomName = useStore((state) => state.room?.name);
  const roomState = useStore((state) => state.room); // Subscribe to entire room state for re-renders
  const currentUser = useStore((state) => state.currentUser);
  
  // Debug: Log documents when they change
  React.useEffect(() => {
    console.log('DocumentsPanel - Documents updated:', documents?.length || 0, documents);
    console.log('DocumentsPanel - Current user:', currentUser?.username);
    console.log('DocumentsPanel - Room state:', roomState);
  }, [documents, currentUser, roomState]);

  // Debug logging for documents
  React.useEffect(() => {
    console.log('DocumentsPanel re-rendered. Documents:', documents?.length || 0);
    console.log('Documents:', documents);
  }, [documents, roomState]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && roomName) {
      socketService.uploadFile(file, roomName);
    }
  };

  const handleUploadClick = () => {
    document.getElementById('file-upload')?.click();
  };
  
  const handleSetView = (docId: string) => {
    console.log('Setting view for document:', docId);
    socketService.setView(docId, 0);
  };

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Documents</h2>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf"
        />
        <button
          onClick={handleUploadClick}
          className="w-full flex items-center justify-center p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-5 h-5 mr-2" />
          <span className="font-medium">Upload PDF</span>
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Room's Files</h2>
        {!documents ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-1">
            {documents.map((file) => (
              <li
                key={file.id}
                onClick={() => handleSetView(file.id)}
                className="flex items-center p-2.5 rounded-lg space-x-3 hover:bg-slate-50 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200">
                  <File className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-700">{file.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DocumentsPanel;