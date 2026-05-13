import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select'; 
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, filter } from 'rxjs/operators';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    MatAutocompleteModule, 
    MatIconModule, 
    MatSelectModule
  ],
  templateUrl: './search-bar.html',
  styleUrls: ['./search-bar.css']
})
export class SearchBarComponent implements OnInit {
  // Using non-null assertion or default values to satisfy TS strict mode
  searchControl = new FormControl<string | any>('');
  propertyTypeControl = new FormControl<string>('Any');
  budgetControl = new FormControl<number>(50000);

  filteredCities: any[] = [];

  constructor(
    private router: Router, 
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Locality Suggestion Logic using OpenStreetMap
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      // Type guard to ensure value is a string and not null
      filter((val): val is string => typeof val === 'string' && val.length > 2),
      switchMap(val => {
        // Fetching villages and localities specifically in India
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&countrycodes=in&limit=5`;
        return this.http.get<any[]>(url).pipe(
          catchError(() => of([]))
        );
      })
    ).subscribe(results => {
      this.filteredCities = results || [];
    });
  }

  // Formats the display text to show "Locality, City, State"
  displayCity = (loc: any): string => {
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    
    const a = loc.address || {};
    const name = a.neighbourhood || a.suburb || a.village || a.town || loc.name || '';
    const city = a.city || a.state_district || '';
    const state = a.state || '';

    return [name, city, state]
      .filter((v, i, arr) => v && arr.indexOf(v) === i)
      .join(', ');
  }

  onCitySelected(event: any) {
    const loc = event.option.value;
    this.navigateToExplore(loc);
  }

  search(event?: Event) {
    if (event) event.preventDefault();
    
    // Safety check for null values to avoid TS assignment errors
    const val = this.searchControl.value;

    if (val && typeof val === 'object') {
       this.navigateToExplore(val);
    } else if (typeof val === 'string' && val.trim()) {
       // Manual text fallback
       this.router.navigate(['/explore-listing'], { 
         queryParams: { 
           city: val,
           propertyType: this.propertyTypeControl.value,
           maxPrice: this.budgetControl.value
         } 
       });
    } else {
       // Search with just filters if input is empty
       this.router.navigate(['/explore-listing'], { 
        queryParams: { 
          propertyType: this.propertyTypeControl.value,
          maxPrice: this.budgetControl.value
        } 
      });
    }
  }

  private navigateToExplore(locData: any) {
    // Extracting coordinates and local address details
    this.router.navigate(['/explore-listing'], { 
      queryParams: { 
        city: locData.address?.city || locData.address?.town || locData.name, 
        state: locData.address?.state,
        lat: locData.lat,   // Latitude for locality-based radial search
        lng: locData.lon,   // Longitude (Nominatim uses 'lon')
        propertyType: this.propertyTypeControl.value,
        maxPrice: this.budgetControl.value
      } 
    });
  }
}