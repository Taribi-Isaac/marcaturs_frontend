export type FooterScrollMode = 'ignore' | 'immediate' | 'on-next-location'

export function footerClickScrollMode(
  event: {
    defaultPrevented: boolean
    button: number
    metaKey: boolean
    altKey: boolean
    ctrlKey: boolean
    shiftKey: boolean
  },
  current: { pathname: string; search: string; hash: string },
  destination: URL,
): FooterScrollMode {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return 'ignore'
  }
  if (destination.hash) return 'ignore'
  if (
    destination.pathname === current.pathname &&
    destination.search === current.search &&
    destination.hash === current.hash
  ) {
    return 'immediate'
  }
  return 'on-next-location'
}
