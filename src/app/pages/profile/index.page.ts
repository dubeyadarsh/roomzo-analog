import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouteMeta } from '@analogjs/router';
import { ToastrService } from 'ngx-toastr';
import { authGuard } from '../../auth.guard';
import { UserProfileService, UserProfile } from '../../services/user-profile.service';
import { ActivityService } from '../../services/activity.service';
import { PropertyService } from '../../services/property.service';
import { AuthService } from '../../services/auth.service';
import { ListingCardComponent } from '../../components/listing-card/listing-card';
import { mapBackendListingsToUi } from '../../services/Utility';

export const routeMeta: RouteMeta = {
  canActivate: [authGuard],
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    ListingCardComponent,
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export default class ProfilePageComponent implements OnInit {
  profileForm!: FormGroup;
  userId: number | null = null;
  isLoading = true;
  isSaving = false;
  profileLoadWarning = '';
  activeSection: 'profile' | 'favorites' | 'activity' = 'profile';

  profile: UserProfile | null = null;
  favoriteListings: any[] = [];
  insights: any = null;
  recentActivity: any[] = [];
  isOwner = false;

  constructor(
    private fb: FormBuilder,
    private profileService: UserProfileService,
    private activityService: ActivityService,
    private propertyService: PropertyService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.buildForm();

    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    const stored = this.getStoredUser();
    if (!stored?.id) {
      this.router.navigate(['/owner-auth'], { queryParams: { returnUrl: '/profile' } });
      return;
    }

    this.userId = parseInt(String(stored.id), 10);
    this.isOwner = localStorage.getItem('userVerifiedWithOtp') === 'true';
    this.applyProfileData(stored);
    this.loadAll();
  }

  private getStoredUser(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }

  private buildForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.maxLength(120)]],
      displayName: ['', [Validators.maxLength(120)]],
      phone: ['', [Validators.pattern(/^$|^[0-9+\-\s]{10,15}$/)]],
      email: ['', [Validators.email]],
      age: [null, [Validators.min(13), Validators.max(120)]],
      address: ['', [Validators.maxLength(500)]],
      city: ['', [Validators.maxLength(150)]],
      state: ['', [Validators.maxLength(150)]],
    });
  }

  private applyProfileData(data: Partial<UserProfile>): void {
    if (!data) return;
    this.profile = { ...(this.profile ?? {}), ...data } as UserProfile;
    this.profileForm.patchValue({
      name: data.name || '',
      displayName: data.displayName || '',
      phone: data.phone || '',
      email: data.email || '',
      age: data.age ?? null,
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
    });
  }

  private loadAll(): void {
    if (!this.userId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.profileLoadWarning = '';

    this.profileService.getProfile(this.userId).subscribe({
      next: (res) => {
        const ok = res?.status === 1 || res?.status === '1';
        if (ok && res.data) {
          this.applyProfileData(res.data);
        } else if (!ok) {
          this.profileLoadWarning =
            res?.message ||
            'Could not sync profile from server. You can still edit and try saving.';
        }
        this.isLoading = false;
      },
      error: () => {
        this.profileLoadWarning =
          'Profile API unavailable. If you recently deployed, run user_profile_migration.sql on the database, then restart the backend.';
        this.isLoading = false;
      },
    });

    this.loadFavorites();
    this.loadInsights();
    this.loadRecentActivity();
  }

  loadFavorites(): void {
    this.propertyService.getFavoriteProperties().subscribe({
      next: (res: any) => {
        const payload = res?.data ?? res?.favorites ?? res?.items ?? res ?? [];
        const favorites = Array.isArray(payload) ? payload : payload?.listings ?? payload?.properties ?? [];
        const normalized = favorites
          .map((item: any) => {
            const property = item?.property ?? item?.listing ?? item;
            return {
              ...property,
              id: property?.id ?? item?.propertyId ?? item?.listingId ?? item?.id,
              propertyName: property?.propertyName ?? property?.title,
              rentAmount: property?.rentAmount ?? property?.price,
              bedrooms: property?.bedrooms,
              bathrooms: property?.bathrooms,
              propertySize: property?.propertySize ?? property?.area,
              city: property?.city,
              state: property?.state,
              photos: property?.photos ?? property?.images ?? [],
              dateCreated: property?.dateCreated ?? property?.createdOn,
              propertyType: property?.propertyType ?? property?.type,
            };
          })
          .filter((p: any) => p?.id);

        this.favoriteListings = mapBackendListingsToUi(normalized);
      },
    });
  }

  loadInsights(): void {
    if (!this.userId) return;
    this.activityService.getUserInsights(this.userId, 5, 90).subscribe({
      next: (res) => {
        this.insights = res?.data ?? null;
      },
    });
  }

  loadRecentActivity(): void {
    if (!this.userId) return;
    this.activityService.getUserActivity(this.userId, 15, 90).subscribe({
      next: (res) => {
        this.recentActivity = res?.data ?? [];
      },
    });
  }

  get displayName(): string {
    return this.profile?.displayName || this.profile?.name || this.profile?.email || 'Your Profile';
  }

  get initials(): string {
    const label = this.displayName;
    return label ? label.charAt(0).toUpperCase() : 'U';
  }

  switchSection(section: 'profile' | 'favorites' | 'activity'): void {
    this.activeSection = section;
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSaveProfile(): void {
    if (!this.userId || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const { email: _email, ...payload } = this.profileForm.getRawValue();
    if (payload.age === '' || payload.age === null) payload.age = null;

    this.profileService.updateProfile(this.userId, payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        const ok = res?.status === 1 || res?.status === '1';
        if (ok) {
          this.profile = res.data;
          const stored = this.getStoredUser() || {};
          this.authService.saveSession({ ...stored, ...res.data });
          this.profileLoadWarning = '';
          this.toastr.success('Profile updated successfully');
        } else {
          this.toastr.error(res?.message || 'Update failed');
        }
      },
      error: () => {
        this.isSaving = false;
        this.toastr.error('Could not save profile. Ensure DB migration is applied and backend is redeployed.');
      },
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/owner-auth'], { queryParams: { forgot: '1' } });
  }

  logout(): void {
    this.authService.logout();
    this.toastr.success('Logged out successfully');
    this.router.navigate(['/']);
  }

  viewProperty(listing: any): void {
    if (listing?.id) {
      this.router.navigate(['/room', listing.id]);
    }
  }

  formatEventLabel(eventType: string): string {
    const map: Record<string, string> = {
      PROPERTY_VIEW: 'Viewed property',
      PROPERTY_CONTACT: 'Contacted owner',
      PROPERTY_SHARE: 'Shared property',
      SEARCH: 'Searched listings',
    };
    return map[eventType] || eventType;
  }

  formatEventIcon(eventType: string): string {
    const map: Record<string, string> = {
      PROPERTY_VIEW: 'visibility',
      PROPERTY_CONTACT: 'call',
      PROPERTY_SHARE: 'share',
      SEARCH: 'search',
    };
    return map[eventType] || 'history';
  }

  formatActivityTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }
}
