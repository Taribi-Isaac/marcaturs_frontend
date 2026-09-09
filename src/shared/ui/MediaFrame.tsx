type Props = {
  src: string
  alt: string
  wide?: boolean
  className?: string
}

/**
 * Replaceable imagery slot — swap `src` without redesigning layout.
 */
export function MediaFrame({ src, alt, wide = false, className }: Props) {
  return (
    <div
      className={['media-frame', wide ? 'media-frame--wide' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <img src={src} alt={alt} loading="lazy" />
    </div>
  )
}
