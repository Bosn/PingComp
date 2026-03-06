import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme } from './theme';
import { App } from './App';
import { ToastProvider } from './components/shared';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" />
    <MantineProvider defaultColorScheme="auto" theme={theme}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MantineProvider>
  </React.StrictMode>
);
