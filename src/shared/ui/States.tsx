import { useLayoutEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { applyDocumentHead } from '@/shared/seo/documentHead'
import { classifyRoute } from '@/shared/seo/routePolicy'

export function PageMeta({
  title,
  description,
  indexable,
  imageUrl,
}: {
  title: string
  description?: string
  /** Override route policy. Prefer omitting — policy derives from path. */
  indexable?: boolean
  /** Optional social preview image (absolute or same-origin path). */
  imageUrl?: string | null
}) {
  const location = useLocation()

  useLayoutEffect(() => {
    const policy = classifyRoute(location.pathname)
    // Never allow indexing on private/auth paths even if a page passes indexable.
    const allowIndex = policy.indexable && indexable !== false
    applyDocumentHead({
      title,
      description,
      indexable: allowIndex,
      imageUrl: allowIndex ? imageUrl : null,
      pathname: location.pathname,
      search: location.search,
    })
  }, [title, description, indexable, imageUrl, location.pathname, location.search])

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
