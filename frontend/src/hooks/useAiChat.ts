import { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatSession } from '../types';
import AIService from '../services/aiService';

interface UseAiChatReturn {
  messages: ChatMessage[];
  inputValue: string;
  isLoading: boolean;
  error: string | null;
  currentSession: ChatSession | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  setInputValue: (value: string) => void;
  setError: (error: string | null) => void;
  handleSendMessage: () => Promise<void>;
  handleResetSession: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: '1',
  text: 'Hello! I\'m your AI financial assistant. I can help you analyze your spending, answer questions about your transactions, and provide financial insights. What would you like to know about your money?',
  isUser: false,
  timestamp: new Date()
};

export const useAiChat = (): UseAiChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session when hook mounts
  useEffect(() => {
    const aiService = AIService.getInstance();
    const session = aiService.getCurrentSession();
    setCurrentSession(session);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiService = AIService.getInstance();
      const response = await aiService.sendMessage(userMessage.text);

      if (response.success && response.response) {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          text: response.response,
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => prev.slice(0, -1).concat([aiResponse]));
      } else {
        // Fallback to mock responses if AI service fails
        const fallbackResponses = [
          "I'm having trouble connecting to the AI service right now. Let me provide some general financial insights based on typical spending patterns.",
          "The AI service is temporarily unavailable. Here are some common financial tips: track your spending categories and look for patterns.",
          "I can't access the AI service at the moment, but I'd suggest reviewing your recent transactions for any unusual spending patterns."
        ];

        const fallbackResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => prev.slice(0, -1).concat([fallbackResponse]));

        if (response.error) {
          console.warn('AI Service Error:', response.error);
        }
      }

      setIsLoading(false);

    } catch (err) {
      setError('Failed to get AI response. Please try again.');
      setMessages(prev => prev.slice(0, -1));
      setIsLoading(false);
    }
  };

  const handleResetSession = () => {
    const aiService = AIService.getInstance();
    const newSession = aiService.resetSession();
    setCurrentSession(newSession);
    setMessages([INITIAL_MESSAGE]);
    setError(null);
  };

  return {
    messages,
    inputValue,
    isLoading,
    error,
    currentSession,
    messagesEndRef,
    inputRef,
    setInputValue,
    setError,
    handleSendMessage,
    handleResetSession,
  };
};
