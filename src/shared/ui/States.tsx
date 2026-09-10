import type { ReactNode } from 'react'

export function PageMeta({ title, description }: { title: string; description?: string }) {
  if (typeof document !== 'undefined') {
    document.title = `${title} · MarcatursHub`
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) {
      meta.setAttribute('content', description)
    }
  }
  return null
}

export function SectionHeading({
  eyebrow,
  title,
  children,
  as = 'h2',
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
  as?: 'h1' | 'h2'
}) {
  const Heading = as
  return (
    <div className="section-heading">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Heading>{title}</Heading>
      {children ? <p>{children}</p> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <div className="skeleton" aria-hidden />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-panel state-panel--empty">
      <h2>{title}</h2>
      {children ? <div className="state-panel__body">{children}</div> : null}
    </div>
  )
}

export function ErrorState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-panel" role="alert">
      <h2>{title}</h2>
      {children ? <div className="state-panel__body">{children}</div> : null}
    </div>
  )
}
