function isGreaterAccra(region: string): boolean {
  const r = region.toLowerCase().trim();
  return r.includes('greater accra') || r.includes('accra') || r.includes('ga');
}

export interface DeliveryEstimate {
  earliestDate: string;
  latestDate: string;
  label: string;
}

export function calculateEstimatedDelivery(
  orderDate: string | Date,
  region: string,
  status: string = 'pending',
): DeliveryEstimate {
  const date = typeof orderDate === 'string' ? new Date(orderDate) : orderDate;
  const processingDays = getProcessingDays(status);
  const shippingDays = getShippingDaysForRegion(region);

  const earliest = addBusinessDays(date, processingDays + shippingDays.min);
  const latest = addBusinessDays(date, processingDays + shippingDays.max);

  return {
    earliestDate: formatDate(earliest),
    latestDate: formatDate(latest),
    label: `${formatDateShort(earliest)} – ${formatDateShort(latest)}`,
  };
}

export function getEstimatedDeliveryForStatus(status: string): { min: number; max: number } {
  if (status === 'shipped' || status === 'processing') return { min: 0, max: 0 };
  return { min: 1, max: 1 };
}

export function getShippingDaysForRegion(region: string): { min: number; max: number } {
  if (isGreaterAccra(region)) return { min: 1, max: 2 };
  return { min: 3, max: 5 };
}

function getProcessingDays(status: string): number {
  if (status === 'shipped' || status === 'processing') return 0;
  return 1;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(date: Date): string {
  const day = date.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
