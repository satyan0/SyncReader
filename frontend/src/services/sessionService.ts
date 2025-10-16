// src/services/sessionService.ts
import socketService from './socketService';
import useStore from '../store/useStore';

class SessionService {
  private sessionTimeout: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Initialize session recovery on app startup
   */
  public initializeSession(): boolean {
    const { currentUser, room, sessionId } = useStore.getState();
    
    if (!currentUser || !room || !sessionId) {
      console.log('No valid session found');
      return false;
    }

    // Check if session is still valid (not expired)
    const sessionData = this.getSessionData();
    if (!sessionData || this.isSessionExpired(sessionData.timestamp)) {
      console.log('Session expired, clearing...');
      this.clearSession();
      return false;
    }

    console.log('Recovering session for user:', currentUser.username, 'in room:', room.name);
    
    // Reconnect socket and rejoin room with proper sequencing
    try {
      // First ensure socket is connected
      socketService.connect();
      
      // Wait a bit for connection to establish, then rejoin
      setTimeout(() => {
        console.log('Rejoining room after session recovery...');
        socketService.joinRoom(currentUser.username, room.name);
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Failed to recover session:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Create a new session
   */
  public createSession(username: string, roomName: string): void {
    const sessionId = this.generateSessionId();
    const timestamp = Date.now();
    
    // Store session data
    const sessionData = {
      sessionId,
      username,
      roomName,
      timestamp,
    };
    
    localStorage.setItem('courtsync-session-data', JSON.stringify(sessionData));
    useStore.getState().setSessionId(sessionId);
    
    console.log('Session created:', sessionId);
  }

  /**
   * Clear the current session
   */
  public clearSession(): void {
    localStorage.removeItem('courtsync-session-data');
    useStore.getState().clearSession();
    socketService.disconnect();
    console.log('Session cleared');
  }

  /**
   * Check if current session is valid
   */
  public isSessionValid(): boolean {
    const { currentUser, room, sessionId } = useStore.getState();
    const sessionData = this.getSessionData();
    
    return !!(currentUser && room && sessionId && sessionData && !this.isSessionExpired(sessionData.timestamp));
  }

  /**
   * Get session data from localStorage
   */
  private getSessionData(): { sessionId: string; username: string; roomName: string; timestamp: number } | null {
    try {
      const data = localStorage.getItem('courtsync-session-data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading session data:', error);
      return null;
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.sessionTimeout;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Refresh session timestamp
   */
  public refreshSession(): void {
    const sessionData = this.getSessionData();
    if (sessionData) {
      sessionData.timestamp = Date.now();
      localStorage.setItem('courtsync-session-data', JSON.stringify(sessionData));
    }
  }
}

const sessionService = new SessionService();
export default sessionService;
