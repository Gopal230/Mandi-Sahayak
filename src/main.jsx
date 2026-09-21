import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FullScreenLoader from './components/FullScreenLoader.jsx'
import "./i18n";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<FullScreenLoader />}>
      <App />
    </Suspense>
  </StrictMode>,
)