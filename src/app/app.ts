import { Component, inject, ChangeDetectorRef } from '@angular/core'; // 1. Added ChangeDetectorRef
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FooterComponent } from './components/footer/footer';
import HeaderComponent from './components/header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CommonModule],
  template: `
    <div *ngIf="isRouteLoading" class="global-loader"></div>
    <app-header></app-header>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
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
  private cd = inject(ChangeDetectorRef); // 2. Inject ChangeDetectorRef

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isRouteLoading = true;
        this.cd.detectChanges(); // 3. Force UI update on start
      } else if (
        event instanceof NavigationEnd || 
        event instanceof NavigationCancel || 
        event instanceof NavigationError
      ) {
        // Wrap the finish in a timeout and force detection
        setTimeout(() => {
          this.isRouteLoading = false;
          this.cd.detectChanges(); // 4. Force UI update on finish
        }, 600);
      }
    });
  }
}