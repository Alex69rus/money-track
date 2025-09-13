import React from 'react';
import { AppBar, Toolbar, Typography, BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { Home, Receipt, Analytics, Chat } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getNavigationValue = () => {
    switch (location.pathname) {
      case '/': return 0;
      case '/transactions': return 1;
      case '/analytics': return 2;
      case '/chat': return 3;
      default: return 0;
    }
  };

  const handleNavigationChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0: navigate('/'); break;
      case 1: navigate('/transactions'); break;
      case 2: navigate('/analytics'); break;
      case 3: navigate('/chat'); break;
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
      
      <Box component="main" sx={{ flexGrow: 1, pb: 7 }}>
        {children}
      </Box>
      
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation
          value={getNavigationValue()}
          onChange={handleNavigationChange}
          showLabels
        >
          <BottomNavigationAction label="Dashboard" icon={<Home />} />
          <BottomNavigationAction label="Transactions" icon={<Receipt />} />
          <BottomNavigationAction label="Analytics" icon={<Analytics />} />
          <BottomNavigationAction label="AI Chat" icon={<Chat />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default Layout;