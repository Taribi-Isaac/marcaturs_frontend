export const settingsKeys = {
  all: ['participant-settings'] as const,
  businessProfile: () => [...settingsKeys.all, 'business-profile'] as const,
  ambassadorProfile: () => [...settingsKeys.all, 'ambassador-profile'] as const,
}
