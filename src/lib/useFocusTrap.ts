import { useEffect } from 'react'

export function useFocusTrap(active: boolean, container: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) {
      return
    }

    const node = container.current
    if (!node) {
      return
    }

    const focusable = node.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable.item(0)
    const last = focusable.item(focusable.length - 1)

    first?.focus()

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusable.length === 0) {
        return
      }
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    node.addEventListener('keydown', handler)
    return () => node.removeEventListener('keydown', handler)
  }, [active, container])
}
