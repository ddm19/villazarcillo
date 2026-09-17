// Persists the last /admin path across a hard reload of this document.
//
// This app is embedded in an iframe (see App.tsx's postMessage handling). The parent
// page only ever points the iframe's `src` at the normal game entry — /admin is reached
// purely via client-side navigation (the secret gesture). If the browser reloads the
// document (F5, or the parent page itself reloading and recreating the iframe from its
// static `src`), that client-side history is lost and we'd land back on the game map.
// sessionStorage survives a reload of this document/origin, so we use it to remember
// "the master was in /admin" and restore it once their admin session comes back.
const KEY = 'villazarcillo:admin-path'

export function rememberAdminPath(path: string): void {
  try {
    sessionStorage.setItem(KEY, path)
  } catch {
    // sessionStorage can throw in locked-down embed contexts; losing the memory is fine.
  }
}

export function getRememberedAdminPath(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function forgetAdminPath(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // no-op
  }
}
