import React from 'react';
import {
  Box,
  List,
  ListItem,
  Avatar,
  Paper,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  SmartToy as BotIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { ChatMessage } from '../types';
import { formatTime } from '../utils/formatters';

interface ChatMessageListProps {
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, messagesEndRef }) => {
  return (
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
  );
};

export default ChatMessageList;
