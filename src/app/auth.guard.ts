import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // 1. SSR Check: Check if we are actually running in the browser
  if (!isPlatformBrowser(platformId)) {
    return true; 
  }

  // 2. Browser Check: ONLY Check Owner Validity
  const isOwnerVerified = localStorage.getItem('ownerVerifiedwWIthOtp') === 'true';
  const ownerLoginTime = localStorage.getItem('loginTimestamp');
  const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

  if (isOwnerVerified && ownerLoginTime) {
    const timeElapsed = Date.now() - parseInt(ownerLoginTime, 10);
    if (timeElapsed < TEN_DAYS) {
      return true; // Let them through to List Property / Manage Listings
    }
  }

  // 3. If Normal User OR Logged Out -> Kick to Owner Auth and remember where they wanted to go
  return router.createUrlTree(['/owner-auth'], { queryParams: { returnUrl: state.url } });
};