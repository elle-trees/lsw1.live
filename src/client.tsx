import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/start/client'
import { App } from './app'
import { auth } from './lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID

onAuthStateChanged(auth, async (user) => {
  if (user && ADMIN_UID && user.uid === ADMIN_UID) {
    try {
      const { setPlayerAdminStatus } = await import('./lib/db/players')
      await setPlayerAdminStatus(ADMIN_UID, true)
    } catch (_error) {
      // Silent fail - admin status will be set on next auth check
    }
  }
})

const rootElement = document.getElementById('root')!

hydrateRoot(
  rootElement,
  <StartClient>
    <App />
  </StartClient>
)

