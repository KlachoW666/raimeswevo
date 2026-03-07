import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useUserStore } from './store/userStore'

// Telegram start_param (e.g. from t.me/bot/app?startapp=REFCODE): set referrer when opening via ref link.
// referredBy is NOT persisted so it's only set when user actually opens the app with startapp= in URL.
const START_PARAM_REGEX = /^[\w-]{1,512}$/

function initTelegramStartParam() {
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
  if (typeof startParam === 'string' && START_PARAM_REGEX.test(startParam)) {
    useUserStore.getState().setReferredBy(startParam.trim().toUpperCase())
  }
}

// Run after a tick so Zustand persist rehydration can complete first (referredBy is excluded from persist)
setTimeout(initTelegramStartParam, 0)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
