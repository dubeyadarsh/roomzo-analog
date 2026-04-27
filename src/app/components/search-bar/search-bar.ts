import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { City, State } from 'country-state-city';
import { MatAutocomplete, MatAutocompleteModule, MatOption } from "@angular/material/autocomplete";
import { MatIcon } from "@angular/material/icon";
import { MatSelectModule } from '@angular/material/select'; 
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatAutocomplete, MatOption, ReactiveFormsModule, MatAutocompleteModule, MatIcon, MatSelectModule, MatIconModule],
  templateUrl: './search-bar.html',
  styleUrls: ['./search-bar.css']
})
export class SearchBarComponent {
  searchControl = new FormControl('');
  propertyTypeControl = new FormControl('Any'); // Default to Any
  budgetControl = new FormControl(50000);       // Default to Max (50k)

  allCities: any[] = [];
  filteredCities: any[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.allCities = City.getCitiesOfCountry('IN') || [];

    this.searchControl.valueChanges.subscribe(val => {
      if (typeof val === 'string') {
        const filterValue = val.toLowerCase();
        this.filteredCities = this.allCities
          .filter(city => city.name.toLowerCase().includes(filterValue))
          .slice(0, 10);
      }
    });
  }

  displayCity = (city: any): string => {
    if (city && city.name) {
       const state = State.getStateByCodeAndCountry(city.stateCode, 'IN');
       return `${city.name}, ${state ? state.name : city.stateCode}`;
    }
    return city || '';
  }

  onCitySelected(event: any) {}

  search(event?: Event) {
    if (event) event.preventDefault();

    const val = this.searchControl.value;

    // Case A: User selected a city from dropdown
    if (val && typeof val === 'object') {
       this.navigateToExplore(val);
       return;
    }

    // Case B: User typed text
    if (typeof val === 'string' && val.trim()) {
      const match = this.filteredCities.find(c => c.name.toLowerCase() === val.toLowerCase());
      if (match) {
        this.navigateToExplore(match);
      } else if (this.filteredCities.length > 0) {
        this.navigateToExplore(this.filteredCities[0]);
      } else {
        this.navigateWithJustFilters(); // No valid city, just pass filters
      }
    } else {
       this.navigateWithJustFilters(); // Empty search bar, just pass filters
    }
  }

  private navigateWithJustFilters() {
     this.router.navigate(['/explore-listing'], { 
      queryParams: { 
        propertyType: this.propertyTypeControl.value,
        maxPrice: this.budgetControl.value
      } 
    });
  }

  private navigateToExplore(cityData: any) {
    const state = State.getStateByCodeAndCountry(cityData.stateCode, 'IN');
    
    this.router.navigate(['/explore-listing'], { 
      queryParams: { 
        city: cityData.name, 
        state: state?.name,
        lat: cityData.latitude,   // EXTRACTION: Latitude
        lng: cityData.longitude,  // EXTRACTION: Longitude
        propertyType: this.propertyTypeControl.value,
        maxPrice: this.budgetControl.value
      } 
    });
  }
}