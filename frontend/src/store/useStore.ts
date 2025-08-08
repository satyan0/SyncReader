// src/store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Highlight {
  id: string;
  text: string;
  selectedText?: string;
  pageNumber: number;
  documentId: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  userId: number;
  username: string;
  timestamp: number;
}

export interface User {
  id: number;
  username: string;
  sid: string;
  current_doc_id: number | null;
  current_page: number;
  highlights: Highlight[];
}

export interface Document {
  id: number;
  name: string;
  pages: number;
  room_id: number;
  uploader_id: number | null;
}

export interface RoomState {
  name: string;
  users: User[];
  documents: Document[];
}

export interface AppState {
  room: RoomState | null;
  currentUser: User | null;
  highlights: { [documentId: number]: Highlight[] };
  sessionId: string | null;
  setRoomState: (state: RoomState) => void;
  setCurrentUser: (user: User) => void;
  addHighlight: (highlight: Highlight) => void;
  removeHighlight: (documentId: number, highlightId: string) => void;
  getHighlightsForDocument: (documentId: number) => Highlight[];
  clearHighlights: (documentId?: number) => void;
  setSessionId: (sessionId: string) => void;
  clearSession: () => void;
}

const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      room: null,
      currentUser: null,
      highlights: {},
      sessionId: null,
      setRoomState: (state: RoomState) => set({ room: state }),
      setCurrentUser: (user: User) => set({ currentUser: user }),
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
      removeHighlight: (documentId: number, highlightId: string) => set((state) => {
        const documentHighlights = state.highlights[documentId] || [];
        return {
          highlights: {
            ...state.highlights,
            [documentId]: documentHighlights.filter(h => h.id !== highlightId)
          }
        };
      }),
      getHighlightsForDocument: (documentId: number) => {
        const state = get();
        return state.highlights[documentId] || [];
      },
      clearHighlights: (documentId?: number) => set((state) => {
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