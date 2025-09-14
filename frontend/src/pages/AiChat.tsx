import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';
import { ChatMessage } from '../types';
import AIService from '../services/aiService';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI financial assistant. I can help you analyze your spending, answer questions about your transactions, and provide financial insights. What would you like to know about your money?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

  const handleResetChat = () => {
    setShowResetDialog(true);
  };

  const handleConfirmReset = () => {
    setMessages([
      {
        id: '1',
        text: 'Hello! I\'m your AI financial assistant. I can help you analyze your spending, answer questions about your transactions, and provide financial insights. What would you like to know about your money?',
        isUser: false,
        timestamp: new Date()
      }
    ]);
    setShowResetDialog(false);
    setError(null);
  };

  const handleCancelReset = () => {
    setShowResetDialog(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2, height: 'calc(100vh - 160px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          AI Chat
        </Typography>
        <IconButton 
          onClick={handleResetChat}
          color="primary"
          size="small"
          sx={{ mr: 1 }}
          title="Reset Chat Session" 
        >
          <ResetIcon />
        </IconButton>
      </Box>
      
      <Paper 
        elevation={3} 
        sx={{ 
          height: 'calc(100% - 80px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Messages Area */}
        <Box 
          sx={{ 
            flex: 1,
            overflowY: 'auto',
            p: 1,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#a8a8a8',
            },
          }}
        >
          <List sx={{ p: 0 }}>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: message.isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  py: 1,
                  px: 2,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: message.isUser ? 'primary.main' : 'secondary.main',
                    width: 32,
                    height: 32,
                    mx: 1,
                  }}
                >
                  {message.isUser ? (
                    <PersonIcon fontSize="small" />
                  ) : (
                    <BotIcon fontSize="small" />
                  )}
                </Avatar>
                
                <Box
                  sx={{
                    maxWidth: '70%',
                    minWidth: '100px',
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      backgroundColor: message.isUser 
                        ? 'primary.main' 
                        : 'background.paper',
                      color: message.isUser ? 'primary.contrastText' : 'text.primary',
                      borderRadius: 3,
                      border: message.isUser ? 'none' : '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {message.isLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">AI is thinking...</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.text}
                      </Typography>
                    )}
                  </Paper>
                  
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      display: 'block',
                      textAlign: message.isUser ? 'right' : 'left',
                    }}
                  >
                    {formatTime(message.timestamp)}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input Area */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={3}
              placeholder="Ask me about your spending, transactions, or financial insights..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                },
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              color="primary"
              size="large"
              sx={{
                p: 1,
                '&.Mui-disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['Show my spending summary', 'What did I spend on groceries?', 'Monthly budget analysis'].map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                size="small"
                variant="outlined"
                onClick={() => setInputValue(suggestion)}
                sx={{ cursor: 'pointer' }}
                disabled={isLoading}
              />
            ))}
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Reset Chat Confirmation Dialog */}
      <Dialog
        open={showResetDialog}
        onClose={handleCancelReset}
        aria-labelledby="reset-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="reset-dialog-title">
          Reset Chat Session
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to reset the chat session? This will clear all conversation history and start fresh.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelReset} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmReset} 
            color="primary" 
            variant="contained"
            startIcon={<ResetIcon />}
          >
            Reset Session
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AIChat;