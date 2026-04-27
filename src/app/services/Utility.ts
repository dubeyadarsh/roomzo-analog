 interface Listing {
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
      { key: 'wifi', label: 'Fast Wifi', icon: 'wifi' ,dbKey:'hasWifi'},
      { key: 'ac', label: 'Air Conditioning', icon: 'ac_unit', dbKey:'hasAc' },
      { key: 'heating', label: 'Heating', icon: 'thermostat', dbKey:'hasHeating' },
      { key: 'parking', label: 'Free Parking', icon: 'local_parking', dbKey:'hasParking' },
      { key: 'gym', label: 'Gym Access', icon: 'fitness_center', dbKey:'hasGym' },
      { key: 'balcony', label: 'Private Balcony', icon: 'balcony', dbKey:'hasBalcony' },
      { key: 'washerDryer', label: 'Washer & Dryer', icon: 'local_laundry_service', dbKey:'hasWasherDryer' },
      { key: 'pets', label: 'Pet Friendly', icon: 'pets', dbKey:'hasPets' },
      { key: 'smokeAlarm', label: 'Smoke Alarm', icon: 'detector_smoke', dbKey:'hasSmokeAlarm' }
    ];
  }