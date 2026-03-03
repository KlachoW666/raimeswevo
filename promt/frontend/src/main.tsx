import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useUserStore } from './store/userStore'

// Telegram start_param (e.g. from ?startapp=REFCODE): persist referrer once at app start
const START_PARAM_REGEX = /^[\w-]{1,512}$/

function initTelegramStartParam() {
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
  if (typeof startParam === 'string' && START_PARAM_REGEX.test(startParam)) {
    useUserStore.getState().setReferredBy(startParam)
  }
}

initTelegramStartParam()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
