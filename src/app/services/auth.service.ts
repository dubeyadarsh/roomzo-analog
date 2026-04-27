import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs'; 
import { environment } from '../environments/environment';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = environment.apiUrl;

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.checkInitialStatus());
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient,@Inject(PLATFORM_ID) private platformId: Object) {}

  private checkInitialStatus(): boolean {
    // 2. Use Angular's SSR Check
    if (isPlatformBrowser(this.platformId)) {
      // 3. Drop the 'window.' prefix completely. It's safe to just call localStorage.
      return localStorage.getItem('ownerVerifiedwWIthOtp') === 'true';
    }
    return false; // Server fallback
  }

  sendOtp(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/send-otp`, { phone: email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/verify-otp`, { phone: email, otp: otp });
  }
saveSession(user: any) {
    // 2. Use Angular's native SSR check
    if (isPlatformBrowser(this.platformId)) {
      // 3. Safely call localStorage directly (no 'window.' prefix)
      localStorage.setItem('ownerVerifiedwWIthOtp', 'true');
      localStorage.setItem('ownerEmail', user.email); 
      localStorage.setItem('ownerUser', JSON.stringify(user));
      localStorage.setItem('loginTimestamp', Date.now().toString());
    }
    this.isLoggedInSubject.next(true);
  }

  saveSessionForSeeingOwnerDetails(email: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('userVerifiedwWIthOtp', 'true');
      localStorage.setItem('userEmail', email); 
      localStorage.setItem('userloginTimestamp', Date.now().toString());
    }
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('ownerVerifiedwWIthOtp');
      localStorage.removeItem('ownerEmail');
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('ownerUser');
      
      // Also a good idea to clear the user session data on full logout
      localStorage.removeItem('userVerifiedwWIthOtp');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userloginTimestamp');
    }
    this.isLoggedInSubject.next(false);
  }

  getOwnerDetails(ownerId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/auth/owner-info/${ownerId}`);
  }

  loginWithFirebase(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/login`, { token });
  }

  sendContactForm(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/contact/send`, data);
  }

  loginOwner(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/login-password`, payload);
  }

  completeRegistration(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/register-complete`, payload);
  }

  forgotPasswordInit(identifier: string) {
    return this.http.post<any>(`${this.baseUrl}/api/auth/forgot-password-init`, { identifier });
  }

  resetPassword(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/api/auth/reset-password`, payload);
  }
}