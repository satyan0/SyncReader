// src/components/activity/ActivityPanel.tsx
import React, { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { Clock, FileText, User, ArrowRight } from 'lucide-react';
import socketService from '../../services/socketService';
import { getUserBorderColor } from '../../utils/userColors';

interface ActivityItem {
  id: string;
  type: 'highlight';
  timestamp: number;
  username: string;
  documentName: string;
  documentId: string;
  pageNumber: number;
  text: string;
  highlight: any; // The full highlight object
}

const ActivityPanel: React.FC = () => {
  const { highlights, room } = useStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // Get all highlights from all documents and sort by timestamp
  const activityItems = useMemo(() => {
    const items: ActivityItem[] = [];
    
    // Only process highlights for documents that exist in the current room
    if (!room?.documents) {
      console.log('No room or documents available');
      return items;
    }
    
    const currentRoomDocumentIds = new Set(room.documents.map(doc => doc.id));
    console.log('Current room document IDs:', Array.from(currentRoomDocumentIds));
    
    // Collect highlights only from documents in the current room
    Object.entries(highlights).forEach(([documentId, docHighlights]) => {
      // Only include highlights for documents that exist in the current room
      if (!currentRoomDocumentIds.has(documentId)) {
        console.log(`Skipping highlights for document ${documentId} - not in current room`);
        return;
      }
      
      const document = room.documents.find(doc => doc.id === documentId);
      
      docHighlights.forEach(highlight => {
        items.push({
          id: highlight.id,
          type: 'highlight',
          timestamp: highlight.timestamp || Date.now(),
          username: highlight.username,
          documentName: document?.name || 'Unknown Document',
          documentId: documentId,
          pageNumber: highlight.pageNumber,
          text: highlight.selectedText || 'Selected text',
          highlight: highlight
        });
      });
    });
    
    console.log(`Found ${items.length} activity items for current room`);
    // Sort by timestamp (latest first)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [highlights, room?.documents]);

  const handleActivityClick = (item: ActivityItem) => {
    // Set the current document and page
    socketService.setView(item.documentId, item.pageNumber);
    
    // Scroll to the specific page after a short delay to ensure the document is loaded
    setTimeout(() => {
      const pageElement = document.getElementById(`page-${item.pageNumber}`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };



  return (
    <div className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ${
      isExpanded ? 'w-64 sm:w-80' : 'w-12'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        {isExpanded && (
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Activity</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
              {activityItems.length}
            </span>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowRight className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-600 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        </button>
      </div>

      {/* Activity List */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {activityItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs">Highlights will appear here</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {activityItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleActivityClick(item)}
                  className={`p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border-l-4 ${getUserBorderColor(item.highlight.userId.toString())}`}
                >
                  <div className="flex items-start">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {item.username}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      
                      {/* Document info */}
                      <div className="flex items-center space-x-1 mb-2">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600 truncate">
                          {item.documentName}
                        </span>
                        <span className="text-xs text-gray-500">
                          • Page {item.pageNumber}
                        </span>
                      </div>
                      
                      {/* Selected text */}
                      <div className="text-xs sm:text-sm text-gray-700 break-words leading-relaxed">
                        "{item.text.length > 80 ? item.text.substring(0, 80) + '...' : item.text}"
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityPanel;
