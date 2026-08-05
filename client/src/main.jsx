import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AppProvider>
          <WorkspaceProvider>
            <App />
          </WorkspaceProvider>
        </AppProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
