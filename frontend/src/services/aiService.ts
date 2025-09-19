import { ChatResponse, ChatSession } from '../types';

class AIService {
  private static instance: AIService;
  private readonly baseUrl: string;
  private currentSession: ChatSession | null = null;

  private constructor() {
    // Make the webhook URL configurable through environment variable
    // Fallback to the production webhook URL if not set
    this.baseUrl = process.env.REACT_APP_AI_WEBHOOK_URL || 
                   'https://money-track.org/webhook/chat';
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Generate a new session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Create a new chat session
  public createSession(userId: number = 1): ChatSession {
    const now = new Date();
    this.currentSession = {
      id: this.generateSessionId(),
      userId,
      createdAt: now,
      lastActivityAt: now
    };
    return this.currentSession;
  }

  // Get current session or create a new one
  public getCurrentSession(userId: number = 1): ChatSession {
    if (!this.currentSession) {
      return this.createSession(userId);
    }
    
    // Update last activity
    this.currentSession.lastActivityAt = new Date();
    return this.currentSession;
  }

  // Reset the current session
  public resetSession(userId: number = 1): ChatSession {
    this.currentSession = null;
    return this.createSession(userId);
  }

  public async sendMessage(message: string, userId?: number): Promise<ChatResponse> {
    try {
      const currentUserId = userId || 1;
      const session = this.getCurrentSession(currentUserId);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any required headers for n8n webhook
        },
        body: JSON.stringify({
          message: message.trim(),
          userId: currentUserId,
          sessionId: session.id,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats from n8n webhook
      if (typeof data === 'string') {
        return {
          response: data,
          success: true,
          sessionId: session.id
        };
      }

      if (data.response || data.message || data.text) {
        return {
          response: data.response || data.message || data.text,
          success: true,
          sessionId: session.id
        };
      }

      // Fallback for unexpected response format
      return {
        response: JSON.stringify(data),
        success: true,
        sessionId: session.id
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      
      return {
        response: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI response'
      };
    }
  }

  // Method to update webhook URL at runtime if needed
  public updateWebhookUrl(newUrl: string): void {
    // This would require creating a new instance with updated URL
    // For now, log the change (in production, this could update a config service)
    console.log('AI Webhook URL change requested:', newUrl);
    // Implementation would depend on requirements for runtime configuration
  }

  // Method to test webhook connectivity
  public async testConnection(): Promise<boolean> {
    try {
      const testMessage = "test connection";
      const result = await this.sendMessage(testMessage);
      return result.success;
    } catch (error) {
      console.error('AI Service connection test failed:', error);
      return false;
    }
  }
}

export default AIService;