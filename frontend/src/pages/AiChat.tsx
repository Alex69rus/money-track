import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { RestartAlt as ResetIcon } from '@mui/icons-material';
import { useAiChat } from '../hooks/useAiChat';
import ChatMessageList from '../components/ChatMessageList';
import ChatInputArea from '../components/ChatInputArea';

const AIChat: React.FC = () => {
  const [showResetDialog, setShowResetDialog] = useState(false);

  const {
    messages,
    inputValue,
    isLoading,
    error,
    messagesEndRef,
    inputRef,
    setInputValue,
    setError,
    handleSendMessage,
    handleResetSession,
  } = useAiChat();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetClick = () => {
    setShowResetDialog(true);
  };

  const handleConfirmReset = () => {
    handleResetSession();
    setShowResetDialog(false);
  };

  const handleCancelReset = () => {
    setShowResetDialog(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2, height: 'calc(100vh - 160px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          AI Chat
        </Typography>
        <IconButton
          onClick={handleResetClick}
          color="primary"
          size="small"
          sx={{ mr: 1 }}
          title="Reset Chat Session"
          aria-label="Reset chat session"
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
        <ChatMessageList messages={messages} messagesEndRef={messagesEndRef} />
        <ChatInputArea
          inputValue={inputValue}
          isLoading={isLoading}
          inputRef={inputRef}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
        />
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
