import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import './index.css'
import App from './App'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={esES}>
      <SignedIn>
        <App />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn signInFallbackRedirectUrl="/" />
      </SignedOut>
    </ClerkProvider>
  </StrictMode>
)
