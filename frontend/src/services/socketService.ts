// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import useStore from '../store/useStore';
import { RoomState, Highlight } from '../store/useStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:5000';
const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;

class SocketService {
  private socket: Socket;
  private reconnectionAttempts: number = 0;

  constructor() {
    this.socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      transports: ['polling', 'websocket'],  // Try polling first, then upgrade to websocket
      withCredentials: true,
      forceNew: true,
      timeout: 10000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Transport events
    this.socket.on('upgrading', (transport) => {
      console.log('Socket upgrading transport to:', transport);
    });

    this.socket.on('upgrade', (transport) => {
      console.log('Socket upgraded to transport:', transport);
    });

    this.socket.on('upgradeError', (err) => {
      console.error('Socket upgrade error:', err);
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected successfully, SID:', this.socket.id);
      this.reconnectionAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectionAttempts++;
      
      if (this.reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
        console.error('Max reconnection attempts reached, falling back to polling');
        // Force transport to polling
        this.socket.io.opts.transports = ['polling'];
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      useStore.getState().setRoomState({
        name: '',
        users: [],
        documents: []
      });
      
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.socket.connect();
        }, RECONNECTION_DELAY);
      }
    });

    // Application events
    this.socket.on('room_update', (data: RoomState) => {
      try {
        console.log('Received room update:', data);
        
        // Validate the data structure
        if (!data || typeof data !== 'object') {
          console.error('Invalid room update data:', data);
          return;
        }

        // Ensure users and documents are arrays
        const validatedData: RoomState = {
          name: data.name || '',
          users: Array.isArray(data.users) ? data.users : [],
          documents: Array.isArray(data.documents) ? data.documents : []
        };

        console.log('Setting room state:', validatedData);
        useStore.getState().setRoomState(validatedData);

        // Find and set the current user
        const currentUser = validatedData.users.find(u => u.sid === this.socket.id);
        if (currentUser) {
          console.log('Setting current user:', currentUser);
          useStore.getState().setCurrentUser(currentUser);
        } else {
          console.log('Current user not found in room update. Socket ID:', this.socket.id);
          console.log('Available users:', validatedData.users.map(u => ({ sid: u.sid, username: u.username })));
        }
      } catch (error) {
        console.error('Error processing room update:', error);
      }
    });

    // Highlight events
    this.socket.on('highlight_added', (highlight: Highlight) => {
      try {
        console.log('Received highlight:', highlight);
        if (highlight && highlight.documentId) {
          // Check if highlight already exists to prevent duplicates
          const existingHighlights = useStore.getState().getHighlightsForDocument(highlight.documentId);
          const highlightExists = existingHighlights.some(h => h.id === highlight.id);
          
          if (!highlightExists) {
            console.log('Adding new highlight to store');
            useStore.getState().addHighlight(highlight);
          } else {
            console.log('Highlight already exists, skipping duplicate');
          }
        }
      } catch (error) {
        console.error('Error processing highlight:', error);
      }
    });

    this.socket.on('highlight_removed', (data: { highlightId: string; documentId?: number }) => {
      try {
        console.log('Received highlight_removed event:', data);
        const { highlightId, documentId } = data;
        
        if (highlightId && documentId) {
          // Remove from local store
          useStore.getState().removeHighlight(documentId, highlightId);
          console.log('Highlight removed from local store');
        } else {
          console.warn('Missing highlightId or documentId in highlight_removed event');
        }
      } catch (error) {
        console.error('Error processing highlight_removed event:', error);
      }
    });

    // Error handling
    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  }

  public connect() {
    console.log('Attempting to connect to socket server...');
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  public joinRoom(username: string, room: string) {
    if (!username || !room) {
      console.error('Username and room name are required');
      return;
    }

    if (!this.socket.connected) {
      console.warn('Socket not connected, connecting first...');
      this.socket.connect();
      
      this.socket.once('connect', () => {
        this.emitJoinRoom(username, room);
      });
    } else {
      this.emitJoinRoom(username, room);
    }
  }

  private emitJoinRoom(username: string, room: string) {
    console.log('Emitting join room event:', { username, room });
    this.socket.emit('join', { username, room }, (response: any) => {
      if (response?.error) {
        console.error('Error joining room:', response.error);
      } else {
        console.log('Successfully joined room:', room);
      }
    });
  }
  
  public uploadFile(file: File, roomName: string): Promise<{ success: boolean; error?: string; documentId?: number }> {
    console.log('uploadFile called with:', { file, roomName });
    console.log('Socket connected:', this.socket.connected);
    
    if (!this.ensureConnection()) {
      console.error('Socket not connected, cannot upload');
      return Promise.reject(new Error('Socket not connected'));
    }
    if (!file || !roomName) {
      console.error('File and room name are required');
      return Promise.reject(new Error('File and room name are required'));
    }

    if (!file.type.includes('pdf')) {
      console.error('Only PDF files are supported');
      return Promise.reject(new Error('Only PDF files are supported'));
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(new Error('Failed to read file'));
      };

      reader.onload = (e) => {
        const fileBuffer = e.target?.result;
        console.log('File read successfully, buffer size:', fileBuffer instanceof ArrayBuffer ? fileBuffer.byteLength : 'string');
        if (fileBuffer) {
          console.log('Emitting upload_file event');
          this.socket.emit('upload_file', {
            name: file.name,
            file: fileBuffer,
          }, (response: any) => {
            if (response?.error) {
              console.error('Error uploading file:', response.error);
              reject(new Error(response.error));
            } else {
              console.log('File uploaded successfully');
              resolve({ 
                success: true, 
                documentId: response?.document_id 
              });
            }
          });
        } else {
          console.error('Failed to read file buffer');
          reject(new Error('Failed to read file buffer'));
        }
      };

      try {
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Error starting file read:', error);
        reject(new Error('Failed to start file read'));
      }
    });
  }

  private ensureConnection(): boolean {
    if (!this.socket.connected) {
      console.error('Socket not connected');
      return false;
    }
    return true;
  }

  public setView(docId: number, page: number) {
    if (!this.ensureConnection()) return;
    if (typeof docId !== 'number' || typeof page !== 'number') {
      console.error('Invalid document ID or page number');
      return;
    }

    console.log('Emitting set_view event:', { doc_id: docId, page });
    this.socket.emit('set_view', { doc_id: docId, page }, (response: any) => {
      if (response?.error) {
        console.error('Error setting view:', response.error);
      } else {
        console.log('View updated successfully');
      }
    });
  }

  public addHighlight(highlight: Highlight) {
    if (!this.ensureConnection()) return;

    console.log('Emitting add_highlight event:', highlight);
    this.socket.emit('add_highlight', highlight, (response: any) => {
      if (response?.error) {
        console.error('Error adding highlight:', response.error);
      } else {
        console.log('Highlight added successfully');
      }
    });
  }

  public removeHighlight(highlightId: string, documentId?: number): Promise<void> {
    if (!this.ensureConnection()) {
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      console.log('Emitting remove_highlight event:', highlightId);
      this.socket.emit('remove_highlight', { highlightId, documentId }, (response: any) => {
        if (response?.error) {
          console.error('Error removing highlight:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('Highlight removed successfully');
          resolve();
        }
      });
    });
  }
}

const socketService = new SocketService();
export default socketService;