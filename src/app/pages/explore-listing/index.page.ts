import { Component, OnInit, ChangeDetectorRef, OnDestroy, Inject, PLATFORM_ID, NgZone } from '@angular/core';
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
  pagesArray: (number | string)[] = [];
  
  private searchSubscription: Subscription | null = null;
  isMobileFiltersOpen = false;

  // --- Dynamic Placeholder Properties ---
  placeholders: string[] = [
    'Search "Civil lines, Prayagraj"',
    'Search "Mumfordganj, Prayagraj"',
    'Search "Teliyarganj, Prayagraj"',
    'Search "George Town, Prayagraj"',
    'Search "Katra, Prayagraj"',
    'Search "Allahpur, Prayagraj"',
    'Search "Kydganj, Prayagraj"',
    'Search "Naini, Prayagraj"',
  ];
  currentPlaceholder: string = '';
  private charIndex: number = 0;
  private placeholderIndex: number = 0;
  private typingTimeout: any;
  private isDestroyed = false;
private activeCityFilter: string = 'Prayagraj';
private activeStateFilter: string = 'Uttar Pradesh';
  constructor(
    private propertyService: PropertyService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient, // INJECTED HTTP CLIENT
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  ngOnInit(): void {
    this.typeEffect();
    
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

    // 1. Dynamically build the search query array
    const queryParts = [val as string];
    if (this.activeCityFilter) queryParts.push(this.activeCityFilter);
    if (this.activeStateFilter) queryParts.push(this.activeStateFilter);
    
    // 2. Join the parts (e.g., "Input, Prayagraj, Uttar Pradesh")
    const searchQuery = queryParts.join(', ');

    // 3. Search API restricted to India (countrycodes=in) for better local relevance
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&countrycodes=in&limit=5`;
    
    return this.http.get<any[]>(url).pipe(catchError(() => of([])));
  })
).subscribe(results => {
  this.filteredCities = results || [];
  this.cd.detectChanges();
});

    this.route.queryParams.subscribe(params => {
      if (Object.keys(params).length > 0) {
        if (params['city'] && params['state'] ) {
          const city = params['city'];
          const state = params['state'];
          const street = params['street'] ?? '';
          this.selectedLocation = { city, state };
          this.searchControl.setValue(`${street}, ${city}, ${state}`, { emitEvent: false });
          
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
    this.isDestroyed = true;
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
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
    // Smart pagination: Show max 7 pages with ellipsis for better UX
    const maxPagesToShow = 7;
    const pages: (number | string)[] = [];
    
    if (this.totalPages <= maxPagesToShow) {
      // If total pages are less than max, show all
      this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i);
      return;
    }

    const startPage = Math.max(0, this.currentPage - 2);
    const endPage = Math.min(this.totalPages - 1, this.currentPage + 2);

    // Always show first page
    pages.push(0);

    // Add ellipsis if there's a gap after first page
    if (startPage > 1) {
      pages.push('...');
    }

    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 0 && i !== this.totalPages - 1) {
        pages.push(i);
      }
    }

    // Add ellipsis if there's a gap before last page
    if (endPage < this.totalPages - 2) {
      pages.push('...');
    }

    // Always show last page
    pages.push(this.totalPages - 1);

    this.pagesArray = pages;
  }

  formatPrice(price: number): string {
    return '₹' + (price ? price.toLocaleString() : '0');
  }

  formatPostedDate(dateString?: string): string {
    if (!dateString) return 'Recently posted';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  
  viewDetails(id: string) {
      this.router.navigate(['/property-details', id]);
  }
  
  toggleMobileFilters(): void {
    this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
  }

  scrollToContact(id: string): void {
    this.router.navigate(['/property-details', id], { 
      queryParams: { focusContact: 'true' } 
    });
  }

  // --- Optimised Typewriter Logic with ChangeDetectorRef ---
  private typeEffect() {
    if (this.isDestroyed) return;

    const currentWord = this.placeholders[this.placeholderIndex];
    
    if (this.charIndex < currentWord.length) {
      this.ngZone.run(() => {
        this.currentPlaceholder += currentWord.charAt(this.charIndex);
        this.cd.markForCheck();   // Immediate UI update
      });
      this.charIndex++;
      this.typingTimeout = setTimeout(() => this.typeEffect(), 40);
    } else {
      this.typingTimeout = setTimeout(() => this.eraseEffect(), 1800);
    }
  }

  private eraseEffect() {
    if (this.isDestroyed) return;

    if (this.charIndex > 0) {
      this.ngZone.run(() => {
        this.currentPlaceholder = this.currentPlaceholder.substring(0, this.charIndex - 1);
        this.cd.markForCheck();   // Immediate UI update
      });
      this.charIndex--;
      this.typingTimeout = setTimeout(() => this.eraseEffect(), 25);
    } else {
      this.placeholderIndex = (this.placeholderIndex + 1) % this.placeholders.length;
      this.typingTimeout = setTimeout(() => this.typeEffect(), 200);
    }
  }

  // Helper for template type checking
  typeof(val: any): string {
    return typeof val;
  }
}