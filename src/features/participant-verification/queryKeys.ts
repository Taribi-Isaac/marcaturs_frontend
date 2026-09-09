export const verificationKeys = {
  all: ['participant-verification'] as const,
  status: () => [...verificationKeys.all, 'status'] as const,
  requirements: () => [...verificationKeys.all, 'requirements'] as const,
}
