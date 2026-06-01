import { Component, inject, ChangeDetectorRef } from '@angular/core'; 
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FooterComponent } from './components/footer/footer';
import HeaderComponent from './components/header/header';
import { ChatDrawerComponent } from './components/chat-drawer/chat-drawer';
import { AnalyticsService } from './services/analytics.service';

// ✅ 1. Import the ChatDrawerComponent

@Component({
  selector: 'app-root',
  standalone: true,
  // ✅ 2. Add ChatDrawerComponent to the imports array
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CommonModule, ChatDrawerComponent],
  template: `
    <div *ngIf="isRouteLoading" class="global-loader"></div>
    <app-header></app-header>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>

    <app-chat-drawer></app-chat-drawer>
  `,
  styles: [`
    .global-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: #008080;
      z-index: 9999;
      animation: loading 2s infinite ease-in-out;
    }
    @keyframes loading {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .main-content { flex: 1; }
  `],
})
export class App {
  isRouteLoading = false;
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);
 private analytics = inject(AnalyticsService);


  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isRouteLoading = true;
        this.cd.detectChanges(); 
      } else if (
        event instanceof NavigationEnd || 
        event instanceof NavigationCancel || 
        event instanceof NavigationError
      ) {
        // Wrap the finish in a timeout and force detection
        setTimeout(() => {
          this.isRouteLoading = false;
          this.cd.detectChanges(); 
        }, 600);
      }
    });
        this.analytics.init();

  }
}