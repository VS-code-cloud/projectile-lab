import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider.tsx'
import { UserDataProvider } from './context/UserDataProvider.tsx'
import {
  MotionPreferenceProvider,
  MotionRoot,
} from './context/MotionPreferenceProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionPreferenceProvider>
      <AuthProvider>
        <UserDataProvider>
          <BrowserRouter>
            <MotionRoot>
              <App />
            </MotionRoot>
          </BrowserRouter>
        </UserDataProvider>
      </AuthProvider>
    </MotionPreferenceProvider>
  </StrictMode>,
)
