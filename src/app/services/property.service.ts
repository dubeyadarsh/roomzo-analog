import { ComponentFactoryResolver, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface ListingFilter {
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: string | number;
  searchQuery?: string; // This handles the text input
  sortBy?: string; // NEW
}
export interface PropertyListing {
  id: string;
  dateCreated: Date;
  details: {
    propertyType: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    bedrooms: number;
    bathrooms: number;
    propertySize: number;
  };
  final: {
    description: string;
    rentAmount: number;
    images: string[];
  };
  amenities: {
    wifi: boolean;
    heating: boolean;
    ac: boolean;
    washerDryer: boolean;
    parking: boolean;
    gym: boolean;
    balcony: boolean;
    pets: boolean;
    smokeAlarm: boolean;
    coAlarm: boolean;
  };
}
export interface PaginatedResponse {
  status: number;
  message: string;
  listings: any[]; // Or use your specific PropertyListing interface here
  currentPage: number;
  totalItems: number;
  totalPages: number;
}
@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private storageKey = 'rental_properties';
  private baseUrl = environment.apiUrl;
  private uploadUrl = environment.hostingerUploadUrl + "/upload.php";

  constructor(private http: HttpClient) {}

 getListings(): PropertyListing[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    }
    return []; 
  }

saveListing(formData: any): Observable<any> {
    const files: File[] = formData.final.images || [];

    const uploadObservables = files.length > 0
      ? files.map((file, index) =>
          this.uploadImageToHostinger(file).pipe(
            tap(res => console.log(`[File ${index + 1}] Upload Response:`, res)),
            catchError(err => {
              console.error(`[File ${index + 1}] Upload FAILED:`, err);
              return of(null);
            })
          )
        )
      : [of(null)];

    return forkJoin(uploadObservables).pipe(
      switchMap((responses: any[]) => {
        
        // This strips out any Hostinger URL that contains '-org'
        const photoUrls = responses
          .filter(res => res && res.status === 1 && !res.url.includes('-org'))
          .map(res => environment.hostingerUploadUrl + res.url);

        const user = JSON.parse(localStorage.getItem("user") || '{}');
        const { final, ...rest } = formData;
        const { images, ...finalWithoutImages } = final;

        const finalPayload = {
          ...rest,
          final: finalWithoutImages, 
          photos: photoUrls, // Backend only sees the watermarked URLs
          ownerId: user.id
        };

        return this.http.post(`${this.baseUrl}/listings/add`, finalPayload);
      })
    );
  }

  private uploadImageToHostinger(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('secret_key', environment.uploadSecretKey);

    // DO NOT set headers manually; Angular will set multipart/form-data automatically
    return this.http.post<any>(this.uploadUrl, formData);
  }

  getAllListings(page: number, size: number, isRented?: boolean): Observable<PaginatedResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    // Only add isRented if it's explicitly passed (true or false)
    if (isRented !== undefined && isRented !== null) {
      params = params.set('isRented', isRented);
    }

    return this.http.get<PaginatedResponse>(`${this.baseUrl}/listings/all`, { params });
  }

  // --- API 2: Search by Location (with Pagination & Optional Filter) ---
  searchListings(state: string, city: string, page: number, size: number, isRented?: boolean): Observable<PaginatedResponse> {
    let params = new HttpParams()
      .set('state', state)
      .set('city', city)
      .set('page', page)
      .set('size', size);

    if (isRented !== undefined && isRented !== null) {
      params = params.set('isRented', isRented ? 1:0);
    }

    return this.http.get<PaginatedResponse>(`${this.baseUrl}/listings/search`, { params });
  }
  getLocationFromCoords(lat: number, lng: number): Observable<any> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    return this.http.get(url);
  }
  getAllListingsWithFilters(page: number, size: number, filters?: ListingFilter, isRented?: boolean): Observable<any> {
    let params = this.buildParams(page, size, filters, isRented);
    console.log('All Listings with Filters - Params:', params.toString());
    return this.http.get(`${this.baseUrl}/listings/allWithFilters`, { params });
  }



  getListingById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/listings/${id}`);
  }
  getGeocode(city: string, state: string): Observable<any> {
    const query = `${city}, ${state}`;
    return this.http.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: query,
        format: 'json',
        limit: '1'
      }
    });
  }
  getMyListings(ownerId: number): Observable<any> {
    // Matches your Java Controller: @GetMapping("/owner/{ownerId}")
return this.http.get(`${this.baseUrl}/listings/owner/${ownerId}`);
  }
  // --- Update Listing (PUT) ---
  updateListing(id: string, data: any): Observable<any> {
    // Matches Backend: @PutMapping("/listings/update/{id}")
    return this.http.
    put(`${this.baseUrl}/listings/update/${id}`, data);
  }
  updateListingStatus(propertyId: number, status: string): Observable<any> {

  return this.http.patch(`${this.baseUrl}/listings/${propertyId}/status`, null, {
    params: { status: status }
  });
}
searchListingsWithFilters(page: number, size: number, filters?: ListingFilter, isRented?: boolean): Observable<any> {
    let params = this.buildParams(page, size, filters, isRented);
    return this.http.get(`${this.baseUrl}/listings/searchWithFilters`, { params });
  }

  private buildParams(page: number, size: number, filters?: ListingFilter, isRented?: any): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (isRented !== undefined && isRented !== null) {
      params = params.set('isRented', isRented?1:0);
    }

    if (filters) {
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice);
      if (filters.propertyType && filters.propertyType !== 'Any') params = params.set('propertyType', filters.propertyType);
      
      if (filters.bedrooms && filters.bedrooms !== 'Any') {
         const bedVal = filters.bedrooms.toString().replace('+', '');
         params = params.set('bedrooms', bedVal);
      }

      // Geo-spatial sorting parameters ONLY
      if (filters.lat) params = params.set('lat', filters.lat);
      if (filters.lng) params = params.set('lng', filters.lng);
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      // DELETED the fallback logic for city/state here. 
      // The backend /searchWithFilters endpoint does not accept them.
    }
    
    return params;
  }
  // --- Get Recent Listings ---
  getRecentListings(limit: number = 5): Observable<PaginatedResponse> {
    let params = new HttpParams().set('limit', limit.toString());
    return this.http.get<PaginatedResponse>(`${this.baseUrl}/listings/recent`, { params });
  }

  reportProperty(payload: any) {
    return this.http.post(`${this.baseUrl}/api/reports/submit`, payload);
  }
  deleteListing(id: number): Observable<any> {
      return this.http.delete(`${this.baseUrl}/listings/delete/${id}`);
    }

   // Add this inside property.service.ts
  exploreByExactCity(city: string, state: string, sortBy: string, page: number, size: number) {
    let params = new HttpParams()
      .set('city', city)
      .set('page', page)
      .set('size', size)
      .set('sortBy', sortBy);

    if (state) params = params.set('state', state);
    
    // Ensure the endpoint matches your ListingController route (e.g., /listings/exploreCity)
    return this.http.get(`${this.baseUrl}/listings/exploreCity`, { params });
  }

  triggerPhoneAndWP(phone: any, actionType: string, prop: any) {
  const phoneStr = String(phone);
  if (actionType === 'call') {
    window.open(`tel:${phoneStr}`, '_self');
  } else {
    const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
    const propertyUrl = `https://roomzo.in/property-details/${prop.id}`;
    const message = encodeURIComponent(`Hi,\n\nI found your property listing on Roomzo. I’m interested in this property and would like to know more about the rent, availability, and facilities.\n\nLooking forward to your response.\n\nRegards,\nRoomzo User\n\nProperty URL: ${propertyUrl}`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  }
}


updateSafetyConsent(userId: number | string, consentGiven: boolean): Observable<any> {
    // The keys MUST match the properties in your UserConsent.java Entity exactly
    const payload = { 
      userId: userId, 
      safetyConsentGiven: consentGiven 
    };
    
    return this.http.post(`${this.baseUrl}/api/consents/save`, payload);
  }

  // Add this inside property.service.ts
  checkSafetyConsent(userId: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/consents/check/${userId}`);
  }
}

export interface ListingFilter {
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: string | number;
  searchQuery?: string; 
  lat?: number;   // NEW: Latitude for distance sorting
  lng?: number;   // NEW: Longitude for distance sorting
  city?: string;  // NEW: Fallback city name
  state?: string; // NEW: Fallback state name
}