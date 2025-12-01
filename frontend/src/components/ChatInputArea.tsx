import React from 'react';
import {
  Box,
  TextField,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface ChatInputAreaProps {
  inputValue: string;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

const SUGGESTIONS = [
  'Show my spending summary',
  'What did I spend on groceries?',
  'Monthly budget analysis'
];

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputValue,
  isLoading,
  inputRef,
  onInputChange,
  onSendMessage,
  onKeyPress,
}) => {
  return (
    <>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={3}
            placeholder="Ask me about your spending, transactions, or financial insights..."
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyPress}
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
            onClick={onSendMessage}
            disabled={!inputValue.trim() || isLoading}
            color="primary"
            size="large"
            sx={{
              p: 1,
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
            aria-label="Send message"
          >
            <SendIcon />
          </IconButton>
        </Box>

        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((suggestion) => (
            <Chip
              key={suggestion}
              label={suggestion}
              size="small"
              variant="outlined"
              onClick={() => onInputChange(suggestion)}
              sx={{ cursor: 'pointer' }}
              disabled={isLoading}
            />
          ))}
        </Box>
      </Box>
    </>
  );
};

export default ChatInputArea;
