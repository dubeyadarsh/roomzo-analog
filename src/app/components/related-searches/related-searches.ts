import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getActiveCities, buildCityPath } from '../../config/cities.config';
import { ROOMZO_CATEGORIES, buildCategoryPath } from '../../config/categories.config';

@Component({
  selector: 'app-related-searches',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './related-searches.html',
  styleUrls: ['./related-searches.css'],
})
export class RelatedSearchesComponent {
  @Input() cityName?: string;
  @Input() compact = false;

  readonly activeCities = getActiveCities();
  readonly categories = ROOMZO_CATEGORIES;

  /** Highly targeted local SEO and Natural-language queries */
  get relatedQueries(): { label: string; routerLink: string | string[] }[] {
    const city = this.cityName?.toLowerCase();

    // --- 1. PRAYAGRAJ / ALLAHABAD SPECIFIC TARGETING ---
    if (city === 'prayagraj' || city === 'allahabad') {
      return [
        // Top 10 Target Pages
        { label: 'Rooms for Rent in Prayagraj', routerLink: '/city/prayagraj' },
        { label: 'Room for Rent in Allahabad', routerLink: '/city/prayagraj' },
        { label: 'PG in Prayagraj', routerLink: '/explore-listing?city=Prayagraj&state=Uttar%20Pradesh&lat=25.4381302&lng=81.8338005&propertyType=PG&maxPrice=50000' },
        { label: 'Flats for Rent in Prayagraj', routerLink: '/explore-listing?city=Prayagraj&state=Uttar%20Pradesh&lat=25.4381302&lng=81.8338005&propertyType=Flat&maxPrice=50000' },
        { label: 'Boys PG in Prayagraj', routerLink: '/category/pg-for-rent' },
        { label: 'Girls PG in Prayagraj', routerLink: '/category/pg-for-rent' },
        { label: 'Rooms Near Allahabad University', routerLink: '/city/prayagraj' },
        { label: 'PG Near Allahabad University', routerLink: '/category/pg-for-rent' },
        { label: 'No Brokerage Rooms in Prayagraj', routerLink: '/category/brokerless-property' },
        { label: 'Flatmates in Prayagraj', routerLink: '/flatmates' },
        
        // Micro-Local Areas
        { label: 'Rooms for Rent in Civil Lines Prayagraj', routerLink: '/city/prayagraj' },
        { label: 'Rooms for Rent in Katra Prayagraj', routerLink: '/city/prayagraj' },
        { label: 'Rooms for Rent in Teliyarganj', routerLink: '/city/prayagraj' },
        { label: 'Rooms for Rent in Naini', routerLink: '/city/prayagraj' },
        { label: 'Rooms for Rent in Jhunsi', routerLink: '/city/prayagraj' },
        { label: 'Rooms for Rent in George Town', routerLink: '/city/prayagraj' },
        { label: 'PG in Civil Lines Prayagraj', routerLink: '/category/pg-for-rent' },
        { label: 'Flats in Civil Lines Prayagraj', routerLink: '/category/flats-for-rent' },
        
        // Additional Student Keywords
        { label: 'Student Rooms in Prayagraj', routerLink: '/category/student-housing' },
        { label: 'Student PG in Prayagraj', routerLink: '/category/student-housing' },
        { label: 'Hostel Near Allahabad University', routerLink: '/category/student-housing' }
      ];
    }

    // --- 2. DYNAMIC TARGETING FOR OTHER CITIES ---
    if (city) {
      const cityUrl = buildCityPath(getActiveCities().find((c) => c.name.toLowerCase() === city) ?? getActiveCities()[0]);
      return [
        { label: `Rooms for Rent in ${this.cityName}`, routerLink: cityUrl },
        { label: `PG in ${this.cityName}`, routerLink: '/category/pg-for-rent' },
        { label: `Flats for Rent in ${this.cityName}`, routerLink: '/category/flats-for-rent' },
        { label: `Boys PG in ${this.cityName}`, routerLink: '/category/pg-for-rent' },
        { label: `Girls PG in ${this.cityName}`, routerLink: '/category/pg-for-rent' },
        { label: `Rooms Near University in ${this.cityName}`, routerLink: '/category/student-housing' },
        { label: `No Brokerage Rooms in ${this.cityName}`, routerLink: '/category/brokerless-property' },
        { label: `Flatmates in ${this.cityName}`, routerLink: '/flatmates' },
      ];
    }

    // --- 3. GLOBAL / DEFAULT TARGETING (No city selected) ---
    return [
      { label: 'Room for Rent in Allahabad', routerLink: '/city/prayagraj' }, // Injecting top priority
      { label: 'Rooms for rent without broker', routerLink: '/explore-listing' },
      { label: 'PG & Hostels for Students', routerLink: '/explore-listing?propertyType=PG&maxPrice=50000' },
      { label: 'Flats for Rent in India', routerLink: '/explore-listing?propertyType=Flat&maxPrice=50000' },
      { label: 'No Brokerage Rooms', routerLink: '/explore-listing?propertyType=Room&maxPrice=50000' },
      { label: 'Find Flatmates', routerLink: '/flatmates' },
      { label: 'Rooms Near Universities', routerLink: '/explore-listing?propertyType=Room&maxPrice=50000' },
    ];
  }

  cityPath = buildCityPath;
  categoryPath = buildCategoryPath;
}