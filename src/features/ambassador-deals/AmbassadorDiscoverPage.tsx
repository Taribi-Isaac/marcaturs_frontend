import { DiscoverPage } from '@/features/marketplace/DiscoverPage'

/** Ambassador shell Discover uses the same public marketplace experience. */
export function AmbassadorDiscoverPage() {
  return (
    <div className="ambassador-discover">
      <DiscoverPage variant="ambassador" />
    </div>
  )
}
