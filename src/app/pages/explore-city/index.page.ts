import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router'; 
import { PropertyService } from '../../services/property.service';
import { RouteMeta } from '@analogjs/router';

export const routeMeta: RouteMeta = {
  title: 'Explore City | RoomZo',
};

@Component({
  selector: 'app-explore-city',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './explore-city.html',
  styleUrls: ['./explore-city.css']
})
export default class ExploreCityComponent implements OnInit {
  
  city: string = '';
  state: string = '';
  
  listings: any[] = [];
  isLoading = false;
  isLoadingMore = false;
  
  // Sorting State
  sortBy: string = 'latest'; 
  isSortMenuOpen = false;

  // Pagination State
  currentPage = 0;
  pageSize = 12; 
  totalPages = 0;
  totalItems = 0;

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.city = params['city'] || 'Explore';
      this.state = params['state'] || '';
      
      this.listings = [];
      this.currentPage = 0;
      this.loadCityData();
    });
  }

  loadCityData(isLoadMore = false): void {
    if (isLoadMore) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
    }
    this.cd.detectChanges();

    this.propertyService.exploreByExactCity(
      this.city, 
      this.state, 
      this.sortBy, 
      this.currentPage, 
      this.pageSize
    ).subscribe({
      next: (response: any) => {
        if (response && response.listings) {
          if (isLoadMore) {
            this.listings = [...this.listings, ...response.listings];
          } else {
            this.listings = response.listings;
          }
          this.totalPages = response.totalPages || 0;
          this.totalItems = response.totalItems || 0;
        }
        this.isLoading = false;
        this.isLoadingMore = false;
        this.cd.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to fetch city data', err);
        this.isLoading = false;
        this.isLoadingMore = false;
        this.cd.detectChanges();
      }
    });
  }

  loadMore(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadCityData(true);
    }
  }

  // --- FIXED SORTING LOGIC ---
  toggleSortMenu(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); 
    }
    this.isSortMenuOpen = !this.isSortMenuOpen;
    this.cd.detectChanges(); // FORCE UI UPDATE
  }

  applySort(newSort: string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); 
    }
    
    this.sortBy = newSort;
    this.isSortMenuOpen = false;
    this.cd.detectChanges(); // FORCE UI UPDATE
    
    // Reset and reload
    this.currentPage = 0;
    this.listings = []; 
    this.loadCityData();
  }

  getSortLabel(): string {
    switch(this.sortBy) {
      case 'latest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'price_low': return 'Price: Low to High';
      case 'price_high': return 'Price: High to Low';
      default: return 'Sort';
    }
  }

  // --- UI Helpers ---
  goBack() {
    this.location.back();
  }

  viewDetails(id: string) {
    this.router.navigate(['/property-details', id]);
  }

  formatPrice(price: number): string {
    return '₹' + (price ? price.toLocaleString('en-IN') : '0');
  }

  formatPostedDate(dateString?: string): string {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const diff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  getCityHeaderImage(): string {
    const cityLower = this.city.toLowerCase();
    if (cityLower.includes('prayagraj')) return 'https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=1600&q=80';
    if (cityLower.includes('varanasi')) return 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=1600&q=80';
    if (cityLower.includes('pune')) return 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1600&q=80';
    return 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&q=80'; 
  }
  scrollToContact(id: string): void {
    this.router.navigate(['/property-details', id], { 
      queryParams: { focusContact: 'true' } 
    });
  }
}