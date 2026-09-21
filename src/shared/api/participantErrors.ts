/** Participant-safe payment copy when the provider/config is unavailable. */
export const PAYMENT_TEMPORARILY_UNAVAILABLE =
  'Payments are temporarily unavailable. Please try again later.'

export function participantPaymentErrorMessage(error: {
  status: number
  message: string
}): string {
  if (error.status === 503) {
    return PAYMENT_TEMPORARILY_UNAVAILABLE
  }
  const technical =
    /not configured|paystack secret|platform payment/i.test(error.message) ||
    /configuration/i.test(error.message)
  if (technical) {
    return PAYMENT_TEMPORARILY_UNAVAILABLE
  }
  return error.message
}
