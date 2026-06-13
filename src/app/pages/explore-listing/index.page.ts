import { Component, OnInit, ChangeDetectorRef, OnDestroy, Inject, PLATFORM_ID, NgZone, HostListener, Renderer2 } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router'; 
import { HttpClient } from '@angular/common/http'; 

import { Subscription, of, forkJoin } from 'rxjs';
import { finalize, debounceTime, distinctUntilChanged, switchMap, catchError, filter, map } from 'rxjs/operators'; 

import { PropertyService, ListingFilter } from '../../services/property.service';
import { RouteMeta } from '@analogjs/router';

export const routeMeta: RouteMeta = {
  title: 'Roomzo : Trusted Rooms, PG & Flats Near You | No Broker | No Fake Listing',
  meta: [
    { 
      // Keep under 160 characters! Highlighting top hubs only for readability.
      name: 'description', 
      content: 'Find 100% broker-free rooms, PGs, and flats for rent in Prayagraj (Katra, Civil Lines), Varanasi (Lanka, BHU), and Pune. Connect directly with owners.' 
    },
    { 
      // You can go heavier here with famous and non-famous localities.
      name: 'keywords', 
      content: 'room rent in prayagraj, pg in varanasi, flat for rent in pune, brokerless pg, katra room rent, civil lines flats, allahpur pg, mumfordganj, teliyarganj, naini, jhunsi, dhoomanganj, lanka varanasi pg, bhu rooms, assi ghat, sigra, mahmoorganj, pandeypur, sarnath, hinjewadi pg, viman nagar flats, kothrud rooms, wakad, baner, zero brokerage roomzo, agentless rental platform' 
    },
    // Open Graph for WhatsApp/Facebook link previews
    { property: 'og:title', content: '100% Brokerless Rooms & PG in UP & Pune | Roomzo' },
    { property: 'og:description', content: 'Zero broker fees. Connect directly with owners for verified single rooms, hostels, and flats in Prayagraj, Varanasi, and Pune.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: 'https://www.roomzo.in/favicon.ico' }, // Ensure this URL points to a real, attractive banner image
  ]
};

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
    bedrooms: 'Any',
    sortBy: 'nearest' // NEW Default
  };

  availabilityFilter: 'available' | 'all' = 'all';

  // Pagination
  currentPage = 0;
  pageSize = 15;
  totalPages = 0;
  pagesArray: (number | string)[] = [];
  
  private searchSubscription: Subscription | null = null;
  isMobileFiltersOpen = false;

  // --- Dynamic Placeholder Properties ---
  placeholders: string[] = [
    'Search "Civil lines, Prayagraj"',
    'Search "Mumfordganj, Prayagraj"',
    'Search "Teliyarganj, Prayagraj"',
    'Search "Viman Nagar, Pune"', // Pune context
    'Search "Katra, Prayagraj"',
    'Search "Lanka, Varanasi"',  // Varanasi context
    'Search "Kydganj, Prayagraj"',
    'Search "Naini, Prayagraj"',
  ];
  currentPlaceholder: string = '';
  private charIndex: number = 0;
  private placeholderIndex: number = 0;
  private typingTimeout: any;
  private isDestroyed = false;
  private documentClickListener: (() => void) | null = null;
  
  isDropdownOpen = false;

  constructor(
    private propertyService: PropertyService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.typeEffect();
    
    // Real-time OpenStreetMap Locality Search using forkJoin for both UP and MH
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter((val): val is string => typeof val === 'string' && val.trim().length > 2), 
      switchMap(val => {
        const text = val as string;

        // 1. Prepare queries for both target states
        const upQuery = `${text}, Uttar Pradesh`;
        const mhQuery = `${text}, Maharashtra`;

        // 2. Build the Nominatim URLs
        const upUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(upQuery)}&addressdetails=1&countrycodes=in&limit=5`;
        const mhUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mhQuery)}&addressdetails=1&countrycodes=in&limit=5`;
        
        // 3. Execute both calls in parallel using forkJoin
        return forkJoin({
          up: this.http.get<any[]>(upUrl).pipe(catchError(() => of([]))),
          mh: this.http.get<any[]>(mhUrl).pipe(catchError(() => of([])))
        }).pipe(
          map(({ up, mh }) => {
            // Combine results from both states
            const combined = [...up, ...mh];
            
            // Sort by OpenStreetMap's relevance 'importance' score
            return combined
              .sort((a, b) => (b.importance || 0) - (a.importance || 0))
              .slice(0, 6); // Keep the top 6 most relevant results overall
          })
        );
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
          const street = params['street'] ?? '';
          this.selectedLocation = { city, state };
          
          // Only show the street and city in the bar if possible to keep it clean
          const displayVal = street ? `${street}, ${city}` : city;
          this.searchControl.setValue(displayVal, { emitEvent: false });
          
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

    if (isPlatformBrowser(this.platformId)) {
      this.documentClickListener = this.renderer.listen('document', 'click', (event: Event) => {
        const target = event.target as HTMLElement;
        const dropdownElement = document.querySelector('.pro-dropdown');
        if (this.isDropdownOpen && dropdownElement && !dropdownElement.contains(target)) {
          this.isDropdownOpen = false;
          this.cd.detectChanges();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.documentClickListener) {
      this.documentClickListener();
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
    this.filters = { minPrice: 0, maxPrice: 50000, propertyType: 'Any', bedrooms: 'Any', sortBy: 'nearest' };    
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
    // Generate a simple array of all pages so CSS can force them to scroll horizontally
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

  // Mouse wheel horizontal scroll logic
  onScroll(event: WheelEvent, element: HTMLElement): void {
    const canScrollHorizontally = element.scrollWidth > element.clientWidth;
    
    if (canScrollHorizontally && event.deltaY !== 0) {
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    }
  }
  
  // Button click horizontal scroll logic
  scrollPagination(element: HTMLElement, direction: 'left' | 'right'): void {
    const scrollAmount = 144; 
    
    if (direction === 'left') {
      element.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  // Simple toggle – no stopPropagation needed
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.cd.detectChanges();  // Force view update
  }

  selectSort(value: string) {
    this.filters.sortBy = value;
    this.isDropdownOpen = false;
    this.applyFilters();
    this.cd.detectChanges();
  }

  getSortLabel(): string {
    switch(this.filters.sortBy) {
      case 'latest': return 'Latest First';
      case 'oldest': return 'Oldest First';
      default: return 'Nearest First';
    }
  }
}