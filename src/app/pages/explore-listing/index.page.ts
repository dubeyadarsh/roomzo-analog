import { Component, OnInit, ChangeDetectorRef, OnDestroy, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router'; 
import { HttpClient } from '@angular/common/http'; 

import { Subscription, of } from 'rxjs';
import { finalize, debounceTime, distinctUntilChanged, switchMap, catchError, filter } from 'rxjs/operators'; 

import { PropertyService, ListingFilter } from '../../services/property.service';
import { RouteMeta } from '@analogjs/router';

export const routeMeta: RouteMeta = {
  title: 'Brokerless Rooms, Flats & PG for Rent in Prayagraj, Varanasi & Lucknow',
  meta: [
    { 
      name: 'description', 
      content: 'Find verified, agentless rooms, PGs, and flats in Prayagraj (Katra, Civil Lines), Varanasi (Lanka, BHU), and Lucknow. 100% broker-free trusted rental platform.' 
    },
    { 
      name: 'keywords', 
      content: 'room rent in prayagraj, pg in varanasi near bhu, flat for rent in lucknow, brokerless pg prayagraj, agentless room rental platform, single room katra, best pg site up' 
    },
    // Open Graph for WhatsApp/Facebook link previews
    { property: 'og:title', content: '100% Brokerless Rooms & PG in UP | Trusted Platform' },
    { property: 'og:description', content: 'Zero broker fees. Connect directly with owners for verified single rooms, hostels, and flats.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: 'https://yourdomain.com/assets/seo-banner.webp' }, // Make sure to add a real banner image
  ]
};

// ... your existing component code ...
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
  filteredCities: any[] = []; 
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
    private http: HttpClient,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  ngOnInit(): void {
    this.typeEffect();
    
    // Real-time OpenStreetMap Locality Search
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(val => typeof val === 'string'), 
      switchMap(val => {
        if (!val || val.length < 2) {
          this.selectedLocation = null;
          return of([]); 
        }

        const queryParts = [val as string];
        if (this.activeCityFilter) queryParts.push(this.activeCityFilter);
        if (this.activeStateFilter) queryParts.push(this.activeStateFilter);
        
        const searchQuery = queryParts.join(', ');
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

  displayCity = (result: any): string => {
    if (!result) return '';
    if (typeof result === 'string') return result;
    
    const addr = result.address || {};
    const locality = addr.neighbourhood || addr.suburb || addr.village || addr.town || result.name || '';
    const city = addr.city || addr.state_district || addr.county || '';
    const state = addr.state || '';

    const parts = [locality, city, state].filter((val, index, arr) => val && arr.indexOf(val) === index);
    return parts.join(', ');
  }

  onCitySelected(event: any) {
    const result = event.option.value;
    const addr = result.address || {};

    this.filters.lat = parseFloat(result.lat);
    this.filters.lng = parseFloat(result.lon); 
    
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
    // UPDATED: Generate a simple array of all pages so CSS can force them to scroll horizontally
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i);
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

  private typeEffect() {
    if (this.isDestroyed) return;

    const currentWord = this.placeholders[this.placeholderIndex];
    
    if (this.charIndex < currentWord.length) {
      this.ngZone.run(() => {
        this.currentPlaceholder += currentWord.charAt(this.charIndex);
        this.cd.markForCheck();   
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
        this.cd.markForCheck();   
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

  // UPDATED: Mouse wheel horizontal scroll logic
  onScroll(event: WheelEvent, element: HTMLElement): void {
    const canScrollHorizontally = element.scrollWidth > element.clientWidth;
    
    if (canScrollHorizontally && event.deltaY !== 0) {
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    }
  }
  // NEW: Button click horizontal scroll logic
  scrollPagination(element: HTMLElement, direction: 'left' | 'right'): void {
    // 144px is roughly the width of 3 buttons (40px each + 8px gaps)
    // You can increase this number if you want it to scroll further per click!
    const scrollAmount = 144; 
    
    if (direction === 'left') {
      element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
}