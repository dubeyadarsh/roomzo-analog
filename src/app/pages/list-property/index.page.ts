import { Component, OnInit, ChangeDetectorRef, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PropertyService } from '../../services/property.service';
import { Country, State, City } from 'country-state-city';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { authGuard } from '../../auth.guard'; // Adjust path based on where your guard is
import { RouteMeta } from '@analogjs/router';
export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
};
// TYPE-ONLY IMPORT: Prevents Leaflet from crashing the Node.js server build
import type * as L from 'leaflet'; 

@Component({
  selector: 'app-list-property',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './list-property.html',
  styleUrls: ['./list-property.css']
})
export default class ListPropertyComponent implements OnInit, AfterViewInit {
  listingForm: FormGroup = new FormGroup({});
  currentStep = 1;
  totalSteps = 4;
  imagePreviews: string[] = [];
  selectedFiles: File[] = [];
  isUploading: boolean = false;
  states: any[] = [];
  cities: any[] = [];
  selectedStateIso: string | null = null;
  readonly WATERMARK_TEXT = 'Roomzo.in';
  isSubmitting = false;

  commonRules = [
    { label: 'No Smoking', value: 'no_smoking', icon: 'smoke_free' },
    { label: 'No Parties', value: 'no_parties', icon: 'celebration' },
    { label: 'Quiet Hours (10PM - 7AM)', value: 'quiet_hours', icon: 'bedtime' },
    { label: 'No Shoes Inside', value: 'no_shoes', icon: 'do_not_step' },
    { label: 'Check-in after 2PM', value: 'check_in_time', icon: 'schedule' }
  ];

  propertyTypes = [
    { label: 'Flat', icon: 'home', value: 'Flat' },
    { label: 'PG', icon: 'apartment', value: 'PG' },
    { label: 'Rooms', icon: 'hotel', value: 'Room' }
  ];

  amenityGroups = [
    { title: 'Essentials', items: [
      { label: 'Wi-Fi', formControlName: 'wifi', icon: 'wifi' },
      { label: 'Heating', formControlName: 'heating', icon: 'hvac' },
      { label: 'Air Conditioning', formControlName: 'ac', icon: 'ac_unit' },
      { label: 'Washer / Dryer', formControlName: 'washerDryer', icon: 'local_laundry_service' }
    ]},
    { title: 'Features', items: [
      { label: 'Parking Spot', formControlName: 'parking', icon: 'local_parking' },
      { label: 'Gym / Fitness', formControlName: 'gym', icon: 'fitness_center' },
      { label: 'Balcony / Patio', formControlName: 'balcony', icon: 'deck' },
      { label: 'Pet Friendly', formControlName: 'pets', icon: 'pets' }
    ]},
    { title: 'Safety', items: [
      { label: 'Smoke Alarm', formControlName: 'smokeAlarm', icon: 'detector_smoke' },
      { label: 'Carbon Monoxide Alarm', formControlName: 'coAlarm', icon: 'warning_amber' }
    ]}
  ];

  private map: L.Map | undefined;
  private marker: L.Marker | undefined;

  constructor(
    private fb: FormBuilder, 
    private propertyService: PropertyService, 
    private cd: ChangeDetectorRef,
    private toastr: ToastrService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object // Inject Platform ID
  ) {}

  ngOnInit(): void {
    this.listingForm = this.fb.group({
      details: this.fb.group({
        propertyType: ['', Validators.required],
        bedrooms: [1, [Validators.required, Validators.min(0)]],
        bathrooms: [1, [Validators.required, Validators.min(0)]],
        propertySize: ['', Validators.required],
        address: this.fb.group({
          street: ['', Validators.required],
          city: ['', Validators.required],
          landmark: ['', Validators.required],
          state: ['', Validators.required],
          zip: ['', Validators.required],
          latitude: [null, Validators.required],  
          longitude: [null, Validators.required]
        })
      }),
      amenities: this.fb.group({
        wifi: [false], heating: [false], ac: [false], washerDryer: [false],
        parking: [false], gym: [false], balcony: [false], pets: [false],
        smokeAlarm: [false], coAlarm: [false]
      }),
      guidebook: this.fb.group({
        rules: this.fb.array([]),
        customRules: [''],
        nearby: this.fb.array([]) 
      }),
      final: this.fb.group({
        contactNo: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]], 
        name: ['', [Validators.required, Validators.maxLength(200)]],
        description: ['', [Validators.required, Validators.maxLength(1000)]],
        rentAmount: ['', Validators.required],
        images: [[]]
      })
    });

    this.addNearbyPlace();
    this.states = State.getStatesOfCountry('IN');
    
    this.detailsGroup.get('address.state')?.valueChanges.subscribe((stateName: string) => {
      const state = this.states.find(s => s.name === stateName);
      this.selectedStateIso = state ? state.isoCode : null;
      this.cities = this.selectedStateIso ? City.getCitiesOfState('IN', this.selectedStateIso) : [];
      if (!this.detailsGroup.get('address.city')?.value) {
        this.detailsGroup.get('address.city')?.reset();
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.fixLeafletIcons();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.currentStep === 1) {
        this.loadMapSafely();
      }
    }
  }

  loadMapSafely(): void {
    if (isPlatformBrowser(this.platformId)) {
      const checkExist = setInterval(() => {
        const mapElement = document.getElementById('propertyMap');
        if (mapElement) {
          clearInterval(checkExist); 
          this.initMap();            
        }
      }, 100);
    }
  }

  get detailsGroup(): FormGroup { return this.listingForm.get('details') as FormGroup; }
  get amenitiesGroup(): FormGroup { return this.listingForm.get('amenities') as FormGroup; }
  get guidebookGroup(): FormGroup { return this.listingForm.get('guidebook') as FormGroup; }
  get finalGroup(): FormGroup { return this.listingForm.get('final') as FormGroup; }
  get nearbyPlaces(): FormArray { return this.guidebookGroup.get('nearby') as FormArray; }
  get rulesArray(): FormArray { return this.guidebookGroup.get('rules') as FormArray; }

  toggleRule(ruleValue: string): void {
    const index = this.rulesArray.controls.findIndex(x => x.value === ruleValue);
    if (index === -1) {
      this.rulesArray.push(this.fb.control(ruleValue));
    } else {
      this.rulesArray.removeAt(index);
    }
  }

  isRuleSelected(ruleValue: string): boolean {
    return this.rulesArray.controls.some(x => x.value === ruleValue);
  }

  addNearbyPlace(): void {
    const placeGroup = this.fb.group({
      name: ['', Validators.required],
      distance: ['', Validators.required], 
      type: ['place'] 
    });
    this.nearbyPlaces.push(placeGroup);
  }

  removeNearbyPlace(index: number): void {
    this.nearbyPlaces.removeAt(index);
  }

  updateCounter(controlName: string, change: number): void {
    const control = this.detailsGroup.get(controlName);
    if (control) {
      const newValue = (control.value || 0) + change;
      if (newValue >= 0) control.setValue(newValue);
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  async onFileSelected(event: any): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.isUploading = true;

    try {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of Array.from(files)) {
        const watermarkedFile = await this.watermarkImage(file);
        newFiles.push(watermarkedFile);
        const preview = await this.readFileAsDataURL(watermarkedFile);
        newPreviews.push(preview);
      }

      this.selectedFiles = [...this.selectedFiles, ...newFiles];
      this.imagePreviews = [...this.imagePreviews, ...newPreviews];
      this.finalGroup.patchValue({ images: this.selectedFiles });
      this.cd.detectChanges();

    } catch (err) {
      console.error('Error processing images:', err);
      this.toastr.error('Failed to process image watermarking.');
    } finally {
      this.isUploading = false;
      input.value = ''; 
      this.cd.detectChanges(); 
    }
  }

  removeImage(index: number): void {
    this.imagePreviews.splice(index, 1);
    this.selectedFiles.splice(index, 1);
    this.finalGroup.patchValue({ images: this.selectedFiles });
  }

  nextStep(): void {
    let groupName = '';
    if (this.currentStep === 1) groupName = 'details';
    else if (this.currentStep === 2) groupName = 'amenities';
    else if (this.currentStep === 3) groupName = 'guidebook';
    else groupName = 'final';

    const group = this.listingForm.get(groupName) as FormGroup;

    if (group && group.valid) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        if (isPlatformBrowser(this.platformId)) window.scrollTo(0, 0);
      }
    } else {
      group?.markAllAsTouched();
      console.warn(`Validation failed on Step ${this.currentStep}. Missing fields:`);
      this.findInvalidControls(group);
      this.toastr.warning('Please complete the highlighted fields.', 'Step Incomplete');
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      if (isPlatformBrowser(this.platformId)) window.scrollTo(0, 0);
      
      if (this.currentStep === 1) {
        this.loadMapSafely();
      }
    }
  }

  onSubmit(): void {
    if (this.listingForm.valid) {
      if (this.isSubmitting) return;

      const rawData = this.listingForm.value;
      const files: File[] = rawData.final.images || [];

      if (files.length < 2) {
        this.toastr.error('Please upload at least two images.', 'Error');
        return;
      }

      this.isSubmitting = true;

      this.propertyService.saveListing(rawData).subscribe({
        next: (response) => {
          this.toastr.success('Listing uploaded successfully!', 'Success');
          this.listingForm.reset();
          this.imagePreviews = [];
          this.selectedFiles = [];
          this.currentStep = 1;
          if (isPlatformBrowser(this.platformId)) window.scrollTo(0, 0);
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.toastr.error('Failed to save listing.', 'Error');
          this.isSubmitting = false; 
        }
      });
    } else {
      this.listingForm.markAllAsTouched();
      console.warn('Final Form Submission Failed. Missing fields:');
      this.findInvalidControls(this.listingForm);
      this.toastr.error('Please fill in all highlighted required fields.');
    }
  }

  private async watermarkImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (readerEvent: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const fontSize = Math.floor(canvas.width * 0.05); 
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; 

          const padding = fontSize / 2;
          ctx.fillText(this.WATERMARK_TEXT, canvas.width - padding, canvas.height - padding);

          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          }, file.type, 0.9); 
        };

        img.onerror = (err) => reject(err);
        img.src = readerEvent.target.result;
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  private async fixLeafletIcons() {
    const leaflet = await import('leaflet');
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    
    const iconDefault = leaflet.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    leaflet.Marker.prototype.options.icon = iconDefault;
  }

  private async initMap(): Promise<void> {
    const leaflet = await import('leaflet');
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }

    this.map = leaflet.map('propertyMap').setView([defaultLat, defaultLng], 5);

    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      this.setMarkerAndAddress(lat, lng);
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 500);
  }

  detectLocation(): void {
    if (isPlatformBrowser(this.platformId) && navigator.geolocation) {
      this.toastr.info('Detecting location...', 'Please wait');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (this.map) {
            this.map.setView([lat, lng], 16);
          }
          this.setMarkerAndAddress(lat, lng);
          this.toastr.success('Location detected!');
        },
        (error) => {
          this.toastr.error('Could not detect location. Please pick on the map.');
        }
      );
    } else if (isPlatformBrowser(this.platformId)) {
      this.toastr.error('Geolocation is not supported by your browser.');
    }
  }

  private async setMarkerAndAddress(lat: number, lng: number): Promise<void> {
    const leaflet = await import('leaflet');

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else if (this.map) {
      this.marker = leaflet.marker([lat, lng]).addTo(this.map);
    }

    this.detailsGroup.get('address')?.patchValue({
      latitude: lat,
      longitude: lng
    });

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    
    this.http.get<any>(url).subscribe(res => {
      if (res && res.address) {
        const addr = res.address;
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const zip = addr.postcode || '';
        const street = addr.road || addr.suburb || '';
        const landmark = addr.county || addr.neighbourhood || ''; 
        this.detailsGroup.get('address.state')?.patchValue(state);
        this.detailsGroup.get('address')?.patchValue({
          city: city,
          zip: zip,
          street: street,
          landmark: landmark
        });
      }
    });
  }

  private findInvalidControls(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.findInvalidControls(control);
      } else if (control?.invalid) {
        console.error(`🔴 Invalid field found: '${key}'`, control.errors);
      }
    });
  }
}