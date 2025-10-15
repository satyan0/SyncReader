// src/store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Highlight {
  id: string;
  text: string;
  selectedText?: string;
  pageNumber: number;
  documentId: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  userId: string;
  username: string;
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  sid: string;
  current_doc_id: string | null;
  current_page: number;
  highlights: Highlight[];
}

export interface Document {
  id: string;
  name: string;
  pages: number;
  room_id: string;
  uploader_id: string | null;
}

export interface RoomState {
  name: string;
  users: User[];
  documents: Document[];
}

export interface AppState {
  room: RoomState | null;
  currentUser: User | null;
  highlights: { [documentId: string]: Highlight[] };
  sessionId: string | null;
  setRoomState: (state: RoomState) => void;
  setCurrentUser: (user: User) => void;
  addHighlight: (highlight: Highlight) => void;
  removeHighlight: (documentId: string, highlightId: string) => void;
  getHighlightsForDocument: (documentId: string) => Highlight[];
  clearHighlights: (documentId?: string) => void;
  setSessionId: (sessionId: string) => void;
  clearSession: () => void;
  clearAllHighlights: () => void;
}

const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      room: null,
      currentUser: null,
      highlights: {},
      sessionId: null,
      setRoomState: (state: RoomState) => {
        console.log('Setting room state with', state.documents?.length || 0, 'documents');
        set({ room: state });
      },
      setCurrentUser: (user: User) => {
        console.log('Setting current user:', user.username);
        set({ currentUser: user });
      },
      addHighlight: (highlight: Highlight) => set((state) => {
        console.log('Adding highlight to store:', highlight.id, 'for document:', highlight.documentId);
        const documentHighlights = state.highlights[highlight.documentId] || [];
        
        // Check for duplicates
        const isDuplicate = documentHighlights.some(h => h.id === highlight.id);
        if (isDuplicate) {
          console.log('Duplicate highlight detected, not adding:', highlight.id);
          return state;
        }
        
        console.log('Adding highlight to store, total highlights for document:', documentHighlights.length + 1);
        return {
          highlights: {
            ...state.highlights,
            [highlight.documentId]: [...documentHighlights, highlight]
          }
        };
      }),
      removeHighlight: (documentId: string, highlightId: string) => set((state) => {
        const documentHighlights = state.highlights[documentId] || [];
        return {
          highlights: {
            ...state.highlights,
            [documentId]: documentHighlights.filter(h => h.id !== highlightId)
          }
        };
      }),
      getHighlightsForDocument: (documentId: string) => {
        const state = get();
        return state.highlights[documentId] || [];
      },
      clearHighlights: (documentId?: string) => set((state) => {
        if (documentId) {
          const newHighlights = { ...state.highlights };
          delete newHighlights[documentId];
          return { highlights: newHighlights };
        }
        return { highlights: {} };
      }),
      setSessionId: (sessionId: string) => set({ sessionId }),
      clearSession: () => set({ 
        room: null, 
        currentUser: null, 
        highlights: {}, 
        sessionId: null 
      }),
      clearAllHighlights: () => set({ highlights: {} }),
    }),
    {
      name: 'courtsync-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        room: state.room,
        sessionId: state.sessionId,
        highlights: state.highlights,
      }),
    }
  )
);

export default useStore;