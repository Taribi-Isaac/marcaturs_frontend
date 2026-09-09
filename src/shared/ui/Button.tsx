import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'on-dark' | 'on-dark-ghost'
type Size = 'md' | 'sm'

type Common = {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}

function classNames(variant: Variant, size: Size, className?: string) {
  return ['btn', `btn--${variant}`, size === 'sm' ? 'btn--sm' : '', className]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={classNames(variant, size, className)} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: Common & LinkProps) {
  return (
    <Link className={classNames(variant, size, className)} {...props}>
      {children}
    </Link>
  )
}
