export const businessCampaignKeys = {
  all: ['business-campaigns'] as const,
  list: () => [...businessCampaignKeys.all, 'list'] as const,
  detail: (id: number) => [...businessCampaignKeys.all, 'detail', id] as const,
  versions: (id: number) => [...businessCampaignKeys.all, 'versions', id] as const,
  version: (id: number, n: number) => [...businessCampaignKeys.all, 'version', id, n] as const,
  resources: (id: number) => [...businessCampaignKeys.all, 'resources', id] as const,
  featured: (id: number) => [...businessCampaignKeys.all, 'featured', id] as const,
  extensionPackages: (id: number) =>
    [...businessCampaignKeys.all, 'extension-packages', id] as const,
  featuredPackages: () => [...businessCampaignKeys.all, 'featured-packages'] as const,
  categories: () => ['categories', 'participant'] as const,
}
