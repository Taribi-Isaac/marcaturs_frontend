import { act } from '@testing-library/react'
import { vi } from 'vitest'

/** Deterministic IntersectionObserver: tests decide when an element intersects. */
class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  readonly root = null
  readonly rootMargin: string
  readonly thresholds = [0]
  readonly elements = new Set<Element>()
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.rootMargin = options?.rootMargin ?? '0px'
    MockIntersectionObserver.instances.push(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  intersect(element: Element) {
    const entry = { isIntersecting: true, target: element } as IntersectionObserverEntry
    this.callback([entry], this)
  }
}

export function installIntersectionObserver() {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
}

/** Elements currently watched by any live observer. */
export function observedElements(): Element[] {
  return MockIntersectionObserver.instances.flatMap((observer) => [...observer.elements])
}

export function observerRootMargins(): string[] {
  return MockIntersectionObserver.instances.map((observer) => observer.rootMargin)
}

/** Reports `element` as entering the (expanded) viewport to every observer watching it. */
export function scrollIntoView(element: Element) {
  act(() => {
    for (const observer of MockIntersectionObserver.instances) {
      if (observer.elements.has(element)) observer.intersect(element)
    }
  })
}
