import { Component, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, RouterModule, NavigationEnd } from '@angular/router'; 
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { FlatmateService } from '../../services/flatmate.service';
import { filter } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

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
    @Inject(PLATFORM_ID) private platformId: Object ,
    private flatmateService: FlatmateService,
    private toastr: ToastrService 
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
        this.isOwner = localStorage.getItem('userVerifiedWithOtp') === 'true';
        
        // 2. Set the appropriate email/name based on the role
      
          this.userMobile = localStorage.getItem('userEmail') || 'User';
        
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
  isPostMenuOpen = false;

  togglePostMenu() {
    this.isPostMenuOpen = !this.isPostMenuOpen;
  }

  handleListProperty() {
    this.isPostMenuOpen = false;
    this.router.navigate(['/list-property']);
  }

  handleListFlatmate() {
    this.isPostMenuOpen = false;
    
    if (!this.isLoggedIn) {
      this.toastr.warning('Please log in to post a flatmate requirement.', 'Authentication Required');
      this.router.navigate(['/owner-auth'], { queryParams: { returnUrl: '/post-flatmate' }});
      return;
    }

          this.router.navigate(['/post-flatmate']); // Route to the new form we will build
        
      
  
  }
}