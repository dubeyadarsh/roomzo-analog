/** SEO category landing pages — maps slug to explore-listing filters. */
export interface RoomzoCategory {
  slug: string;
  label: string;
  propertyType?: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  relatedTerms: string[];
}

export const ROOMZO_CATEGORIES: RoomzoCategory[] = [
  {
    slug: 'rooms-for-rent',
    label: 'Rooms for Rent',
    propertyType: 'Room',
    seoTitle: 'Rooms for Rent in India | No Broker | Roomzo',
    seoDescription:
      'Browse verified single rooms for rent across India. Direct owner contact, zero brokerage, and student-friendly listings on Roomzo.',
    keywords: ['room for rent', 'single room rent', 'brokerless room', 'student room'],
    relatedTerms: ['pg for rent', 'flat for rent', 'hostel near me'],
  },
  {
    slug: 'student-housing',
    label: 'Student Housing',
    propertyType: 'PG',
    seoTitle: 'Student Housing & PG Near Colleges | Roomzo',
    seoDescription:
      'Affordable student housing, PGs, and shared flats near universities. Verified broker-free listings for students across India.',
    keywords: ['student housing', 'pg near college', 'hostel for students', 'coaching hostel'],
    relatedTerms: ['bhu pg', 'allahabad university room', 'kota coaching hostel'],
  },
  {
    slug: 'pg-for-rent',
    label: 'PG for Rent',
    propertyType: 'PG',
    seoTitle: 'PG for Rent | Boys & Girls PG | No Brokerage | Roomzo',
    seoDescription:
      'Find boys and girls PG for rent with meals, WiFi, and verified owners. No hidden brokerage on Roomzo.',
    keywords: ['pg for rent', 'paying guest', 'boys pg', 'girls pg', 'furnished pg'],
    relatedTerms: ['pg with food', 'single occupancy pg', 'pg near metro'],
  },
  {
    slug: 'flats-for-rent',
    label: 'Flats for Rent',
    propertyType: 'Flat',
    seoTitle: 'Flats for Rent | 1BHK 2BHK | Brokerless | Roomzo',
    seoDescription:
      'Rent 1BHK, 2BHK, and family flats directly from owners. Zero broker fees and verified listings on Roomzo.',
    keywords: ['flat for rent', '1bhk rent', '2bhk flat', 'family flat rent'],
    relatedTerms: ['furnished flat', 'semi furnished flat', 'apartment for rent'],
  },
  {
    slug: 'brokerless-property',
    label: 'Brokerless Property',
    seoTitle: 'Brokerless Property Rentals in India | Roomzo',
    seoDescription:
      'Skip brokers entirely. Roomzo connects tenants with verified property owners for rooms, PGs, and flats — 100% agentless.',
    keywords: ['brokerless property', 'no broker rent', 'zero brokerage', 'direct owner rent'],
    relatedTerms: ['alternatives to 99acres', 'housing.com without broker', 'nobroker alternative'],
  },
];

export function getCategoryBySlug(slug: string): RoomzoCategory | undefined {
  return ROOMZO_CATEGORIES.find((c) => c.slug === slug.toLowerCase());
}

export function buildCategoryPath(category: RoomzoCategory): string {
  return `/category/${category.slug}`;
}
