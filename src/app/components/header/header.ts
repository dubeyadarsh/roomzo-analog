import { Component, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, RouterModule, NavigationEnd } from '@angular/router'; 
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, RouterLinkActive, RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export default class HeaderComponent implements OnInit {
  isLoggedIn = false;
  isOwner = false; // Strictly tracks if the logged-in user is a Landlord/Owner
  isMenuOpen = false; 
  isDropdownOpen = false; 
  userMobile = '';
  isScrolled = false;
  isHomePage = true;

  constructor(
    private router: Router, 
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isHomePage = event.urlAfterRedirects === '/' || event.urlAfterRedirects.startsWith('/#');
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled = window.scrollY > 50;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) { 
    this.isDropdownOpen = false;
  }

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((status) => {
      this.isLoggedIn = status;
      
      if (status && isPlatformBrowser(this.platformId)) {
        // 1. Determine WHO is logged in by checking local storage
        this.isOwner = localStorage.getItem('ownerVerifiedwWIthOtp') === 'true';
        
        // 2. Set the appropriate email/name based on the role
        if (this.isOwner) {
          this.userMobile = localStorage.getItem('ownerEmail') || 'Owner';
        } else {
          this.userMobile = localStorage.getItem('userEmail') || 'User';
        }
      } else {
        // Logged out or SSR fallback
        this.isOwner = false;
        this.userMobile = '';
        this.isMenuOpen = false;
        this.isDropdownOpen = false;
      }
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) this.isDropdownOpen = false;
  }

  toggleDropdown(event: Event) {
    event.stopPropagation(); 
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) this.isMenuOpen = false;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  logout() {
    this.authService.logout(); 
    this.isLoggedIn = false;
    this.isOwner = false;   
    this.userMobile = '';     
    this.isMenuOpen = false;   
    this.isDropdownOpen = false; 
    this.router.navigate(['/']);
  }
}