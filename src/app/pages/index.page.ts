import { afterNextRender, Component, Inject, PLATFORM_ID, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core'; 
import { HeroComponent } from '../components/hero/hero';
import { ContactComponent } from '../components/contact/contact';
import { PropertyService } from '../services/property.service';
import { mapBackendListingsToUi } from '../services/Utility';

interface Listing {
  id: number;
  title: string;
  location: string;
  price: number;
  priceUnit?: string; 
  image: string;
  badge: { text: string; color: 'blue' | 'green' | 'purple' };
  specs: { beds: number; baths: number; area: number };
  rating?: number;
  isFavorite: boolean;
  postedDate?: string; 
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, MatIconModule, MatButtonModule, ContactComponent, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export default class HomeComponent implements OnInit {
  @ViewChild('carouselGrid') carouselGrid!: ElementRef;
  @ViewChild('nearbyCarouselGrid', { static: false }) nearbyCarouselGrid!: ElementRef;
  listings: Listing[] = [];
  isLoading: boolean = true;
  nearbyListings: Listing[] = [];
  isLoadingNearby: boolean = false;
  nearbyIsAtStart: boolean = true;
  nearbyIsAtEnd: boolean = false;
  currentCarouselIndex: number = 0;
  carouselItemsToShow: number = 3; 
  isAtStart: boolean = true;
  isAtEnd: boolean = false;
  
  Math = Math; 

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private propertyService: PropertyService, 
    private cd: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {
    afterNextRender(() => {
      this.calculateItemsToShow();
      this.fetchRecentListings();
      this.fetchNearbyProperties(); // NEW: Trigger location request
      if (isPlatformBrowser(this.platformId)) {
        window.addEventListener('resize', () => this.calculateItemsToShow());
      }
    });
  }
popularCities = [
    { 
      name: 'Prayagraj', 
      state: 'Uttar Pradesh', 
      image: 'https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=400&q=80',
      active: true
    },
    { 
      name: 'Varanasi', 
      state: 'Uttar Pradesh', 
      image: 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=400&q=80',
      active: true
    },
    { 
      name: 'Pune', 
      state: 'Maharashtra', 
      image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80',
      active: true
    },
    { 
      name: 'Mumbai', 
      state: 'Maharashtra', 
      image: 'https://images.unsplash.com/photo-1522256658092-1279a04a6fc6?w=400&q=80',
      active: false
    },
    { 
      name: 'Jaipur', 
      state: 'Rajasthan', 
      image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&q=80',
      active: false
    },
    { 
      name: 'Kota', 
      state: 'Rajasthan', 
      image: 'https://images.unsplash.com/photo-1565019018445-560b435af769?w=400&q=80',
      active: false
    }
  ];
  ngOnInit(): void {
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'contact' && isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          const contactElement = document.querySelector('app-contact');
          if (contactElement) {
            contactElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    });
  }

  calculateItemsToShow(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const width = window.innerWidth;
    if (width < 600) {
      this.carouselItemsToShow = 1; // Mobile
    } else if (width < 900) {
      this.carouselItemsToShow = 2; // Tablet
    } else {
      this.carouselItemsToShow = 3; // Desktop
    }
    
    // Check scroll state on resize
    this.onScroll();
    this.cd.detectChanges();
  }

  fetchRecentListings() {
    this.isLoading = true;
    
    this.propertyService.getRecentListings(5).subscribe(
      (response: any) => {
        if (response.listings && response.listings.length > 0) {
          this.listings = mapBackendListingsToUi(response.listings);
          this.calculateItemsToShow();
        }
        this.isLoading = false;

        
        this.cd.detectChanges();
        
        // Wait for DOM to render then check bounds
        setTimeout(() => this.onScroll(), 100);
      },
      (error) => {
        console.error('Error fetching recent listings:', error);
        this.isLoading = false;
        this.cd.detectChanges();
      }
    );
  }

  // Native Scroll Event Handler
  onScroll(): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    
    const el = this.carouselGrid.nativeElement;
    
    // Update button states
    this.isAtStart = el.scrollLeft <= 0;
    this.isAtEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;

    // Update index for active dots
    const card = el.querySelector('.listing-card');
    if (card) {
      const cardWidth = card.offsetWidth;
      const gap = parseInt(window.getComputedStyle(el).gap) || 0;
      this.currentCarouselIndex = Math.round(el.scrollLeft / (cardWidth + gap));
    }
    
    this.cd.detectChanges();
  }

  scrollLeft(): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.carouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' });
  }

  scrollRight(): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.carouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: (cardWidth + gap), behavior: 'smooth' });
  }

  scrollToIndex(index: number): void {
    if (!this.carouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.carouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
  }

  getVisibleIndices(): number[] {
    const visible = [];
    for (let i = 0; i < this.carouselItemsToShow && this.currentCarouselIndex + i < this.listings.length; i++) {
      visible.push(this.currentCarouselIndex + i);
    }
    return visible;
  }

  formatPrice(price: number): string {
    return price >= 10000
      ? '₹' + (price / 1000).toFixed(0) + 'k'
      : '₹' + price.toLocaleString();
  }

formatPostedDate(dateString?: string): string {
  if (!dateString) return 'Recently posted';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  
  // Guard against future dates caused by slight client/server clock desyncs
  if (diffInMs < 0) return 'Just now';

  // Calculate base units
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    // Fallback to absolute date
    return date.toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}

  viewDetails(id: any): void {
    this.router.navigate(['/property-details', id]);
  }

  scrollToContact(id: number): void {
    this.router.navigate(['/property-details', id], { 
      queryParams: { focusContact: 'true' } 
    });
  }
  fetchNearbyProperties(): void {
    if (!isPlatformBrowser(this.platformId) || !('geolocation' in navigator)) return;

    this.isLoadingNearby = true;
    
    // Request User Location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Call our backend with the coordinates and 'nearest' sort
        this.propertyService.searchListingsWithFilters(0, 5, { lat, lng, sortBy: 'nearest' }).subscribe(
          (res: any) => {
            if (res.listings && res.listings.length > 0) {
              this.nearbyListings = mapBackendListingsToUi(res.listings);
            }
            this.isLoadingNearby = false;
            this.cd.detectChanges();
            setTimeout(() => this.onNearbyScroll(), 100);
          },
          (err) => {
            console.error('Error fetching nearby listings', err);
            this.isLoadingNearby = false;
            this.cd.detectChanges();
          }
        );
      },
      (error) => {
        // If user denies location, it fails silently and section remains hidden
        console.warn('Geolocation denied or failed', error);
        this.isLoadingNearby = false;
        this.cd.detectChanges();
      }
    );
  }

  onNearbyScroll(): void {
    if (!this.nearbyCarouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.nearbyCarouselGrid.nativeElement;
    this.nearbyIsAtStart = el.scrollLeft <= 0;
    this.nearbyIsAtEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;
    this.cd.detectChanges();
  }

  scrollNearbyLeft(): void {
    if (!this.nearbyCarouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.nearbyCarouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: -(cardWidth + gap), behavior: 'smooth' });
  }

  scrollNearbyRight(): void {
    if (!this.nearbyCarouselGrid || !isPlatformBrowser(this.platformId)) return;
    const el = this.nearbyCarouselGrid.nativeElement;
    const cardWidth = el.querySelector('.listing-card').offsetWidth;
    const gap = parseInt(window.getComputedStyle(el).gap) || 0;
    el.scrollBy({ left: (cardWidth + gap), behavior: 'smooth' });
  }
  exploreCity(cityName: string, stateName: string) {
    // Navigates to the brand new page!
    this.router.navigate(['/explore-city'], { 
      queryParams: { 
        city: cityName,
        state: stateName
      } 
    });
  }
}