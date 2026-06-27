import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router'; 
import { PropertyService } from '../../services/property.service';
import { RouteMeta } from '@analogjs/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

// 1. Import Safety Consent Bottom Sheet & Type
import { SafetyConsentBottomSheetComponent, PendingAction } from '../../components/safety-consent/safety-consent';

export const routeMeta: RouteMeta = {
  title: 'Explore City | RoomZo',
};

@Component({
  selector: 'app-explore-city',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule,
    SafetyConsentBottomSheetComponent // 2. Add to imports
  ],
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

  // 3. Safety Consent State Signals
  userHasGivenConsent = signal(false); 
  isConsentModalOpen = signal(false);
  pendingAction = signal<PendingAction | any>(null);

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef,
    private location: Location,
    private authService: AuthService,
    private toastr: ToastrService,
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

    // 4. Check if returning from Login
    this.checkReturnFromLogin();
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

  toggleSortMenu(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); 
    }
    this.isSortMenuOpen = !this.isSortMenuOpen;
    this.cd.detectChanges(); 
  }

  applySort(newSort: string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); 
    }
    
    this.sortBy = newSort;
    this.isSortMenuOpen = false;
    this.cd.detectChanges(); 
    
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
    if (cityLower.includes('prayagraj')) return 'prayagraj.jpeg';
    if (cityLower.includes('varanasi')) return 'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=1600&q=80';
    if (cityLower.includes('pune')) return 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1600&q=80';
    return 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&q=80'; 
  }
  
  scrollToContact(id: string): void {
    this.router.navigate(['/property-details', id], { 
      queryParams: { focusContact: 'true' } 
    });
  }

  // --- 5. Contact & Consent Logic ---

  checkReturnFromLogin() {
    if (isPlatformBrowser(this.platformId) && (this.isUserLoggedIn() || this.isOwnerLoggedIn())) {
      const pending = localStorage.getItem('pendingAction');
      
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          localStorage.removeItem('pendingAction'); 

          this.propertyService.getListingById(parsed.propertyId).subscribe({
            next: (res: any) => {
              if (res.status === 1 && res.data) {
                this.handleCardContactAction(res.data, parsed.action);
              }
            }
          });
        } catch (e) {
          localStorage.removeItem('pendingAction');
        }
      }
    }
  }

  handleCardContactAction(prop: any, actionType: 'call' | 'whatsapp') {
    if (this.isUserLoggedIn() || this.isOwnerLoggedIn()) {
      const actionPayload = { prop, actionType };
      
      this.checkAndExecuteConsent(actionPayload, () => {
        this.executeContactAction(prop, actionType);
      });
      
    } else {
      const returnUrl = this.router.url;
      localStorage.setItem('pendingAction', JSON.stringify({ action: actionType, propertyId: prop.id }));
      this.router.navigate(['/owner-auth'], { queryParams: { returnUrl: returnUrl } });
    }
  }

  private executeContactAction(prop: any, actionType: 'call' | 'whatsapp') {
    const phone = prop.contactNo || prop.tempContactNo;
    if (!phone) {
      this.propertyService.getListingById(prop.id).subscribe((res: any) => {
          const p = res.data;
          const phoneNum = p.contactNo || p.tempContactNo;
          if(phoneNum) this.propertyService.triggerPhoneAndWP(phoneNum, actionType, p);
          else this.toastr.error('Contact number not available');
      });
      return;
    }
    this.propertyService.triggerPhoneAndWP(phone, actionType, prop);
  }

  private checkAndExecuteConsent(actionData: any, successCallback: () => void) {
    if (this.userHasGivenConsent() || (isPlatformBrowser(this.platformId) && localStorage.getItem('safetyConsentGiven') === 'true')) {
      this.userHasGivenConsent.set(true);
      successCallback();
      return;
    }

    let userId = null;
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try { userId = JSON.parse(storedUser).id; } catch (e) {}
      }
    }

    if (userId) {
      this.propertyService.checkSafetyConsent(userId).subscribe({
        next: (res: any) => {
          if (res.status === 1 && res.hasConsent) {
            if (isPlatformBrowser(this.platformId)) localStorage.setItem('safetyConsentGiven', 'true');
            this.userHasGivenConsent.set(true);
            successCallback();
          } else {
            this.pendingAction.set(actionData);
            this.isConsentModalOpen.set(true);
            this.cd.detectChanges(); 
          }
        },
        error: () => {
          this.pendingAction.set(actionData);
          this.isConsentModalOpen.set(true);
          this.cd.detectChanges();
        }
      });
    } else {
      this.pendingAction.set(actionData);
      this.isConsentModalOpen.set(true);
      this.cd.detectChanges();
    }
  }

  onConsentAccepted(action: any) {
    let userId = null;
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try { userId = JSON.parse(storedUser).id; } catch (e) {}
      }
    }

    const proceedWithAction = () => {
      this.executeContactAction(action.prop, action.actionType);
    };

    if (userId) {
      this.propertyService.updateSafetyConsent(userId, true).subscribe({
        next: (res: any) => {
          if (res.status === 1) {
            this.userHasGivenConsent.set(true);
            if (isPlatformBrowser(this.platformId)) localStorage.setItem('safetyConsentGiven', 'true');
            proceedWithAction();
          } else {
            this.toastr.error('Failed to record consent. Please try again.');
          }
        },
        error: (err) => {
          console.error('Consent save error:', err);
          this.toastr.error('Server error while recording consent.');
        }
      });
    } else {
      this.userHasGivenConsent.set(true);
      if (isPlatformBrowser(this.platformId)) localStorage.setItem('safetyConsentGiven', 'true');
      proceedWithAction();
    }
  }

  isUserLoggedIn(): boolean {
    return !!(localStorage.getItem('token') || localStorage.getItem('user'));
  }

  isOwnerLoggedIn(): boolean {
    return this.isUserLoggedIn(); 
  }
}