export enum PaymentMethod {
  STRIPE = 'stripe',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REQUIRES_ACTION = 'requires_action',
}
