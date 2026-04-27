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
        const photoUrls = responses
          .filter(res => res && res.status === 1)
          .map(res => environment.hostingerUploadUrl +  res.url);
      const user=  JSON.parse(localStorage.getItem("ownerUser") || '{}');
      const { final, ...rest } = formData;
        const { images, ...finalWithoutImages } = final;

        const finalPayload = {
          ...rest,
          final: finalWithoutImages, // keep final object but without images
          photos: photoUrls      ,     // add uploaded photo URLs
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
      params = params.set('isRented', isRented);
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

  private buildParams(page: number, size: number, filters?: ListingFilter, isRented?: boolean): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (isRented !== undefined) {
      params = params.set('isRented', isRented);
    }

    if (filters) {
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice);
      if (filters.propertyType && filters.propertyType !== 'Any') params = params.set('propertyType', filters.propertyType);
      
      if (filters.bedrooms && filters.bedrooms !== 'Any') {
         const bedVal = filters.bedrooms.toString().replace('+', '');
         params = params.set('bedrooms', bedVal);
      }

      // Geo-spatial sorting parameters
      if (filters.lat) params = params.set('lat', filters.lat);
      if (filters.lng) params = params.set('lng', filters.lng);
      
      // Fallback location parameters if Lat/Lng fail
      if (filters.city) params = params.set('city', filters.city);
      if (filters.state) params = params.set('state', filters.state);
    }
    
    return params;
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