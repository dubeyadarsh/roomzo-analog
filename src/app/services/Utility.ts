export interface Listing {
  id: number;
  title: string;
  location: string;
  price: number;
  priceUnit?: string; // e.g. '/month' or 'Total Price'
  image: string;
  badge: { text: string; color: 'blue' | 'green' | 'purple' };
  specs: { beds: number; baths: number; area: number };
  rating?: number;
  isFavorite: boolean;
}

export function mapBackendListingsToUi(list: any[]): Listing[] {
  return list.map(item => ({
    id: item.id,

    title: item.propertyName
      ? item.propertyName
      : item.propertyType?.toUpperCase() || 'Property',

    location: `${item.city}, ${item.state}`,

    price: item.rentAmount,
    priceUnit: '/month',

    image: item.photos?.length
      ? item.photos[0].photoUrl
      : 'assets/no-image.jpg',

    badge: {
      text: item.isRented ? 'RENTED' : 'FOR RENT',
      color: item.isRented ?  'blue' : 'green'
    },

    specs: {
      beds: item.bedrooms,
      baths: item.bathrooms,
      area: item.propertySize
    },
    rating: +(4 + Math.random()).toFixed(1), 

    // Random boolean for favorite
    isFavorite: Math.random() >= 0.5
  }));
}

export function getAmenitiesMap() {
  return [
    { key: 'bed', label: 'Bed & Mattress', icon: 'bed', dbKey: 'hasBed' },
    { key: 'almirah', label: 'Almirah / Cupboard', icon: 'door_sliding', dbKey: 'hasAlmirah' },
    { key: 'studyTable', label: 'Study Table & Chair', icon: 'desk', dbKey: 'hasStudyTable' },
    { key: 'fanLight', label: 'Fan & Tube Light', icon: 'mode_fan', dbKey: 'hasFanLight' },
    { key: 'roWater', label: 'RO Water Purifier', icon: 'water_drop', dbKey: 'hasRoWater' },
    { key: 'inverter', label: 'Power Backup', icon: 'battery_charging_full', dbKey: 'hasInverter' },
    { key: 'cooling', label: 'AC / Air Cooler', icon: 'ac_unit', dbKey: 'hasCooling' },
    { key: 'geyser', label: 'Geyser (Hot Water)', icon: 'hot_tub', dbKey: 'hasGeyser' },
    { key: 'wifi', label: 'Wi-Fi Internet', icon: 'wifi', dbKey: 'hasWifi' },
    { key: 'parking', label: 'Parking Space', icon: 'local_parking', dbKey: 'hasParking' },
    { key: 'cctv', label: 'CCTV Security', icon: 'videocam', dbKey: 'hasCctv' },
    { key: 'washingMachine', label: 'Washing Machine', icon: 'local_laundry_service', dbKey: 'hasWashingMachine' }
  ];
}