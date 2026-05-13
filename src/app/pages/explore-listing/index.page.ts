import { Component, OnInit, ChangeDetectorRef, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router'; 
import { HttpClient } from '@angular/common/http'; // NEW: Required for API

import { Subscription, of } from 'rxjs';
import { finalize, debounceTime, distinctUntilChanged, switchMap, catchError, filter } from 'rxjs/operators'; // NEW: RxJS operators

import { PropertyService, ListingFilter } from '../../services/property.service';
// REMOVED: country-state-city imports since we are using live API now

@Component({
  selector: 'app-explore-listings',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, 
    FormsModule, ReactiveFormsModule, 
    MatAutocompleteModule, MatInputModule
  ],
  templateUrl: './explore-listing.html',
  styleUrls: ['./explore-listing.css']
})
export default class ExploreListingsComponent implements OnInit, OnDestroy {
  
  // Data State
  listings: any[] = [];
  totalItems = 0;
  isLoading = false;

  // Search State
  searchControl = new FormControl('');
  filteredCities: any[] = []; // Now holds Nominatim search results
  selectedLocation: { city: string, state: string } | null = null;

  // Filter State
  filters: ListingFilter = {
    minPrice: 0,
    maxPrice: 50000,
    propertyType: 'Any',
    bedrooms: 'Any'
  };

  availabilityFilter: 'available' | 'all' = 'all';

  // Pagination
  currentPage = 0;
  pageSize = 6;
  totalPages = 0;
  pagesArray: number[] = [];
  
  private searchSubscription: Subscription | null = null;
  isMobileFiltersOpen = false; 

  constructor(
    private propertyService: PropertyService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient, // INJECTED HTTP CLIENT
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  ngOnInit(): void {
    // NEW: Real-time OpenStreetMap Locality Search
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(val => typeof val === 'string'), // Only trigger on text, not on object selection
      switchMap(val => {
        if (!val || val.length < 2) {
          this.selectedLocation = null;
          return of([]); // Clear suggestions if empty
        }
        // Search API restricted to India (countrycodes=in) for better local relevance
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val as string)}&addressdetails=1&countrycodes=in&limit=5`;
        return this.http.get<any[]>(url).pipe(catchError(() => of([])));
      })
    ).subscribe(results => {
      this.filteredCities = results || [];
      this.cd.detectChanges();
    });

    this.route.queryParams.subscribe(params => {
      if (Object.keys(params).length > 0) {
        if (params['city'] && params['state']) {
          const city = params['city'];
          const state = params['state'];
          this.selectedLocation = { city, state };
          this.searchControl.setValue(`${city}, ${state}`, { emitEvent: false });
          
          this.filters.city = city;
          this.filters.state = state;
        }

        if (params['lat'] && params['lng']) {
          this.filters.lat = Number(params['lat']);
          this.filters.lng = Number(params['lng']);
        }

        if (params['propertyType']) {
          this.filters.propertyType = params['propertyType'];
        }

        if (params['maxPrice']) {
          this.filters.maxPrice = Number(params['maxPrice']);
        }
      }

      this.loadListings();
    });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // Helper to format the long Nominatim API response into a clean "Locality, City, State" string
  displayCity = (result: any): string => {
    if (!result) return '';
    if (typeof result === 'string') return result;
    
    const addr = result.address || {};
    const locality = addr.neighbourhood || addr.suburb || addr.village || addr.town || result.name || '';
    const city = addr.city || addr.state_district || addr.county || '';
    const state = addr.state || '';

    // Remove duplicates (e.g., if locality and city are the same) and join with commas
    const parts = [locality, city, state].filter((val, index, arr) => val && arr.indexOf(val) === index);
    return parts.join(', ');
  }

  onCitySelected(event: any) {
    const result = event.option.value;
    const addr = result.address || {};

    // Get exact coordinates of the locality selected
    this.filters.lat = parseFloat(result.lat);
    this.filters.lng = parseFloat(result.lon); // Nominatim uses 'lon' instead of 'lng'
    
    // Extract highest-level city/state for fallback filtering
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';

    this.filters.city = city;
    this.filters.state = state;

    this.selectedLocation = { city, state };
    this.applyFilters();
  }

  loadListings(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    this.isLoading = true;
    this.cd.detectChanges();

    let isRentedParam = this.availabilityFilter === 'available' ? false : undefined;

    if (!this.filters.city && !this.filters.lat) {
      if (isPlatformBrowser(this.platformId)) {
        const storedLocation = localStorage.getItem('user_geo_location');
        if (storedLocation) {
          const parsed = JSON.parse(storedLocation);
          this.filters.lat = parsed.lat;
          this.filters.lng = parsed.lng;
        }
      }
    }

    this.searchSubscription = this.propertyService.searchListingsWithFilters(
        this.currentPage,
        this.pageSize,
        this.filters,
        isRentedParam
      ).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cd.detectChanges(); 
      })
    ).subscribe({
      next: (response: any) => {
        if (!response) {
            this.listings = [];
            this.totalItems = 0;
            return;
        }
        this.listings = response.listings || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.calculatePagination();
      },
      error: (err: any) => {
        console.error('API Error:', err);
        this.listings = []; 
        this.totalItems = 0;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadListings();
  }

  resetFilters(): void {
    this.filters = { minPrice: 0, maxPrice: 50000, propertyType: 'Any', bedrooms: 'Any' };
    this.searchControl.setValue('');
    this.selectedLocation = null;
    this.availabilityFilter = 'available';
    this.applyFilters();
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadListings();
    }
  }

  calculatePagination(): void {
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i);
  }

  formatPrice(price: number): string {
    return '₹' + (price ? price.toLocaleString() : '0');
  }
  
  viewDetails(id: string) {
      this.router.navigate(['/property-details', id]);
  }
  
  toggleMobileFilters(): void {
    this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
  }
}