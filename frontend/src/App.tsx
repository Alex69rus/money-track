import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Money Track
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Money Track
        </Typography>
        <Typography variant="body1">
          Your personal money tracking application is starting up...
        </Typography>
      </Container>
    </ThemeProvider>
  );
}

export default App;