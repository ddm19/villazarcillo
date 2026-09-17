import { useEffect } from 'react'

type SecretGestureOptions = {
  selector: string
  clicksRequired?: number
  windowMs?: number
  onTrigger: () => void
}

/**
 * Watches clicks on the first element matching `selector` and fires `onTrigger`
 * once `clicksRequired` clicks land within a rolling `windowMs` window.
 * Used as the hidden entry point into /admin (no visible button).
 */
export function useSecretGesture({ selector, clicksRequired = 10, windowMs = 4000, onTrigger }: SecretGestureOptions) {
  useEffect(() => {
    let timestamps: number[] = []
    let target: Element | null = null
    let observer: MutationObserver | null = null

    const handleClick = () => {
      const now = Date.now()
      timestamps = [...timestamps, now].filter((t) => now - t <= windowMs)
      if (timestamps.length >= clicksRequired) {
        timestamps = []
        onTrigger()
      }
    }

    const attach = () => {
      const found = document.querySelector(selector)
      if (found && found !== target) {
        target?.removeEventListener('click', handleClick)
        target = found
        target.addEventListener('click', handleClick)
      }
    }

    attach()
    observer = new MutationObserver(attach)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      target?.removeEventListener('click', handleClick)
      observer?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, clicksRequired, windowMs])
}
