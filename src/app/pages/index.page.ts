import { afterNextRender, Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core'; 
import { RouterModule } from '@angular/router';
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
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, MatIconModule, MatButtonModule, ContactComponent, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export default class HomeComponent {
  listings: Listing[] = [];
  isLoading: boolean = true; 

  // 1. Inject PLATFORM_ID
  constructor(
    private router: Router, 
    private http: HttpClient, 
    private propertyService: PropertyService, 
    private cd: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {
    // afterNextRender is great because it defers execution until the browser paints
    afterNextRender(() => {
      this.checkAndGetLocation();
    });
  }

  ngOnInit(): void {}

  checkAndGetLocation() {
    // 2. Protect localStorage access
    if (isPlatformBrowser(this.platformId)) {
      const storedData = localStorage.getItem('user_geo_location');

      if (storedData) {
        const location = JSON.parse(storedData);
        console.log('Using stored location:', location);
        this.fetchDataUsingLocation(location);
      } else {
        this.requestBrowserLocation();
      }
    } else {
      // If server somehow gets here, just fetch default listings
      this.fetchDataWithoutLocation();
    }
  }

  requestBrowserLocation() {
    // 3. Protect navigator access
    if (isPlatformBrowser(this.platformId) && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('GPS Location obtained:', position.coords);
          this.propertyService.getLocationFromCoords(position.coords.latitude, position.coords.longitude).subscribe(locationData => {
            console.log('Location data from coordinates:', locationData);
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              city: locationData.address.city,
              state: locationData.address.state,
              source: 'gps' 
            };

            this.saveAndUseLocation(coords);
          });
        },
        (error) => {
          console.warn('GPS Denied or Error. Falling back to IP Location...');
          this.getIpLocation();
        },
        {
          enableHighAccuracy: true,
          timeout: 6000, 
          maximumAge: 0
        }
      );
    } else {
      this.getIpLocation();
    }
  }

  getIpLocation() {
    this.http.get('https://ipapi.co/json/').subscribe({
      next: (data: any) => {
        const coords = {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city, 
          source: 'ip',
          state: data.region
        };
        console.log('Location fetched via IP:', coords);
        this.saveAndUseLocation(coords);
      },
      error: (err) => {
        console.error('IP Location failed. Loading default Mumbai view.', err);
        this.fetchDataWithoutLocation();
      }
    });
  }

  saveAndUseLocation(coords: any) {
    // 4. Protect localStorage access
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user_geo_location', JSON.stringify(coords));
    }
    
    this.fetchDataUsingLocation(coords);
  }

  fetchDataUsingLocation(coords: any) {
    this.isLoading = true;
    
    const locationFilter: any = {
      lat: coords.lat,
      lng: coords.lng
    };

    this.propertyService.searchListingsWithFilters(0, 3, locationFilter).subscribe((response: any) => {
      if (response.listings && response.listings.length > 0) {
        this.listings = mapBackendListingsToUi(response.listings);
        this.isLoading = false;
        this.cd.detectChanges();
      } else {
        this.fetchDataWithoutLocation(); 
      }
    });
  }

  fetchDataWithoutLocation() {
    this.isLoading = true;

    this.propertyService.searchListingsWithFilters(0, 3, {}).subscribe((response: any) => {
      if (response.listings) {
        this.listings = mapBackendListingsToUi(response.listings);
      }
      this.isLoading = false;
      this.cd.detectChanges();
    });
  }

  formatPrice(price: number): string {
    return price >= 10000
      ? '₹' + (price / 1000).toFixed(0) + 'k'
      : '₹' + price.toLocaleString();
  }

  viewDetails(id: any): void {
    this.router.navigate(['/property-details', id]);
  }
}