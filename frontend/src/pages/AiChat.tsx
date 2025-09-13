import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const AiChat: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h4" gutterBottom>
        AI Chat
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" color="text.secondary">
          "Talk to your money" AI chat will be implemented in a future iteration
        </Typography>
      </Box>
    </Container>
  );
};

export default AiChat;