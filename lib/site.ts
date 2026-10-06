/**
 * Business details shown on legal pages, receipts and emails.
 * Optional values come from environment variables so real registration
 * details are never invented in code; blank values are simply not shown.
 */
export const SITE = {
  name: 'Local Drop Shipping GH',
  url: 'https://www.localdropshippinggh.com',
  phones: ['+233 55 660 9232', '+233 54 285 5399'],
  location: 'Accra, Ghana',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  /** Registered business name, if different from the trading name. */
  legalName: process.env.NEXT_PUBLIC_BUSINESS_LEGAL_NAME || '',
  /** Data Protection Commission (Ghana) registration number. */
  dpcRegistration: process.env.NEXT_PUBLIC_DPC_REGISTRATION || '',
  policiesUpdated: '6 October 2026',
};

/**
 * Rules referenced by the policies and the order screens.
 * Keep returnWindowDays in sync with request_refund() in supabase/launch-features.sql.
 */
export const POLICY = {
  returnWindowDays: 7,
  /** Order statuses a customer may cancel on their own. */
  cancellableStatuses: ['pending', 'confirmed'] as const,
};
