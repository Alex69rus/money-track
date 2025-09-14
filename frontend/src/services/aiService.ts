import { ChatResponse } from '../types';

class AIService {
  private static instance: AIService;
  private readonly baseUrl: string;

  private constructor() {
    // Make the webhook URL configurable through environment variable
    // Fallback to the provided URL if not set
    this.baseUrl = process.env.REACT_APP_AI_WEBHOOK_URL || 
                   'https://delicate-halibut-tolerant.ngrok-free.app/webhook/944a3301-513d-4628-803c-1c3edbfd698d/chat';
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async sendMessage(message: string, userId?: number): Promise<ChatResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any required headers for n8n webhook
        },
        body: JSON.stringify({
          message: message.trim(),
          userId: userId || 1, // Default user ID if not provided
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
          success: true
        };
      }

      if (data.response || data.message || data.text) {
        return {
          response: data.response || data.message || data.text,
          success: true
        };
      }

      // Fallback for unexpected response format
      return {
        response: JSON.stringify(data),
        success: true
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