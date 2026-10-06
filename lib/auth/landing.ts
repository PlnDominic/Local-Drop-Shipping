/** Where a signed-in person starts: their own dashboard, or the marketplace for shoppers. */
export function landingPath(role: string | null | undefined): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'supplier': return '/supplier';
    case 'dropshipper': return '/dropshipper';
    default: return '/marketplace';
  }
}
