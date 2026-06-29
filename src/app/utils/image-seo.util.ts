const PLACEHOLDER =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';

export interface PropertyImageContext {
  propertyType?: string;
  propertyName?: string;
  street?: string;
  city?: string;
  state?: string;
}

/** SEO-friendly alt text for property images. */
export function generatePropertyAltText(
  property: PropertyImageContext,
  index = 0
): string {
  const type = property.propertyType ?? 'Room';
  const location = [property.street, property.city, property.state]
    .filter(Boolean)
    .join(', ');
  const suffix =
    index === 0
      ? ' — verified broker-free listing'
      : ` — photo ${index + 1}`;
  const base = property.propertyName
    ? `${property.propertyName}${suffix}`
    : `${type} for rent in ${location || 'India'}${suffix}`;
  return `${base} | Roomzo`;
}

export function getListingImageUrl(
  photos?: { photoUrl: string }[],
  fallback = PLACEHOLDER
): string {
  return photos?.[0]?.photoUrl ?? fallback;
}

/** Append width/quality params for faster LCP where CDN supports it. */
export function optimizeImageUrl(url: string, width = 600): string {
  if (!url || url.startsWith('assets/')) return url;
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=80&auto=format&fit=crop`;
  }
  return url;
}

export const LISTING_CARD_ASPECT = '4 / 3';
