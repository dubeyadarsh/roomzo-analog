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
    if (isPlatformBrowser(this.platformId)) {
      // Fixed typo in key name
      return localStorage.getItem('userVerifiedWithOtp') === 'true';
    }
    return false; 
  }

  sendOtp(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/send-otp`, { phone: email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/verify-otp`, { phone: email, otp: otp });
  }
saveSession(user: any) {
    if (isPlatformBrowser(this.platformId)) {
      // Fixed typo in key name
      localStorage.setItem('userVerifiedWithOtp', 'true');
      localStorage.setItem('userEmail', user.email); 
      localStorage.setItem('user', JSON.stringify(user));
      // This correctly matches what your component is looking for
      localStorage.setItem('loginTimestamp', Date.now().toString());
    }
    this.isLoggedInSubject.next(true);
  }



 logout() {
    if (isPlatformBrowser(this.platformId)) {
      // Fixed typo in key name
      localStorage.removeItem('userVerifiedWithOtp');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('user');
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

  login(payload: any): Observable<any> {
    // Make sure your payload has 'identifier' and 'password'
    return this.http.post(`${this.baseUrl}/api/auth/login`, payload); 
  }
  completeRegistration(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/auth/register`, payload);
  }

  forgotPasswordInit(identifier: string) {
    return this.http.post<any>(`${this.baseUrl}/api/auth/forgot-password-init`, { identifier });
  }

  resetPassword(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/api/auth/reset-password`, payload);
  }
}