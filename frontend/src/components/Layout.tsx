import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { Receipt, Analytics, Chat } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleViewportChange = () => {
      // Detect virtual keyboard by checking viewport height changes
      const viewportHeight = window.innerHeight;
      const screenHeight = window.screen.height;

      // If viewport is significantly smaller than screen, keyboard is likely open
      const heightDifference = screenHeight - viewportHeight;
      setIsKeyboardOpen(heightDifference > 300); // Increased threshold for better detection
    };

    // Listen for viewport changes
    window.addEventListener('resize', handleViewportChange);

    // Initial check
    handleViewportChange();

    return () => {
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  const getNavigationValue = () => {
    switch (location.pathname) {
      case '/': return 0;
      case '/transactions': return 0;
      case '/analytics': return 1;
      case '/chat': return 2;
      default: return 0;
    }
  };

  const handleNavigationChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0: navigate('/transactions'); break;
      case 1: navigate('/analytics'); break;
      case 2: navigate('/chat'); break;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Money Track
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{
        flexGrow: 1,
        pb: isKeyboardOpen ? 1 : 7 // Reduce bottom padding when keyboard is open
      }}>
        {children}
      </Box>

      <Paper sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 1300, // Higher than MUI modal backdrop (1200) and drawer (1200)
        // Hide navigation when keyboard is open to prevent overlap
        display: isKeyboardOpen ? 'none' : 'block',
        transition: 'opacity 0.2s ease-in-out',
        opacity: isKeyboardOpen ? 0 : 1
      }} elevation={3}>
        <BottomNavigation
          value={getNavigationValue()}
          onChange={handleNavigationChange}
          showLabels
        >
          <BottomNavigationAction label="Transactions" icon={<Receipt />} aria-label="View transactions" />
          <BottomNavigationAction label="Analytics" icon={<Analytics />} aria-label="View analytics" />
          <BottomNavigationAction label="AI Chat" icon={<Chat />} aria-label="Open AI chat" />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default Layout;