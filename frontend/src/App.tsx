import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import AiChat from './pages/AiChat';
import TelegramService from './services/telegram';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6442d6',
      light: '#8b6ddb',
      dark: '#4a2f9e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#625b71',
      light: '#7c7585',
      dark: '#443c4d',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fef7ff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1d1b20',
      secondary: '#49454f',
    },
    grey: {
      50: '#fef7ff',
      100: '#f4eff4',
      200: '#e7e0ec',
      300: '#cac4d0',
      400: '#a69fb6',
      500: '#79747e',
      600: '#5f5c65',
      700: '#49454f',
      800: '#322f37',
      900: '#1d1b20',
    },
    divider: '#cac4d0',
  },
  typography: {
    fontFamily: [
      'Google Sans',
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      fontWeight: 400,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 16,
  },
  spacing: 8,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 1px 3px 0px rgba(0, 0, 0, 0.12), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 2px 1px -1px rgba(0, 0, 0, 0.20)',
          border: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontWeight: 500,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 24,
          paddingRight: 24,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 3px 0px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#fef7ff',
          color: '#1d1b20',
          boxShadow: 'none',
          borderBottom: '1px solid #e7e0ec',
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e7e0ec',
          height: 80,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#79747e',
          '&.Mui-selected': {
            color: '#6442d6',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});

function App() {
  useEffect(() => {
    TelegramService.getInstance();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Transactions />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/chat" element={<AiChat />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;