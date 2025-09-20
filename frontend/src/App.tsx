import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import AiChat from './pages/AiChat';
import TelegramService from './services/telegram';

const theme = createTheme();

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