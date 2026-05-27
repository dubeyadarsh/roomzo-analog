import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="legal-container">
      <h1>Terms & Conditions</h1>
      <p><strong>Last Updated:</strong> May 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing and using RoomZo, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>

      <h2>2. User Responsibilities</h2>
      <p>You are responsible for any activity that occurs under your account. You agree not to post any false, misleading, or fraudulent property listings. RoomZo reserves the right to remove any listing or suspend any account that violates our community standards.</p>

      <h2>3. Platform Role</h2>
      <p>RoomZo acts as a platform to connect property owners and seekers. We are not a real estate agency or broker. We do not guarantee the accuracy of listings and are not liable for any disputes arising between users.</p>

      <h2>4. Intellectual Property</h2>
      <p>All content on this website, including text, graphics, logos, and software, is the property of RoomZo and protected by copyright and intellectual property laws.</p>

      <h2>5. Changes to Terms</h2>
      <p>We reserve the right to modify these terms at any time. Your continued use of the platform following the posting of changes will mean that you accept and agree to the changes.</p>
    </div>
  `,
  styles: [`
    .legal-container {
      max-width: 800px;
      margin: 60px auto;
      padding: 20px;
      color: var(--rz-text-main);
      font-family: var(--font-sans);
      line-height: 1.6;
      min-height: 60vh;
    }
    h1 { font-size: 2.5rem; margin-bottom: 8px; color: var(--rz-text-main); }
    h2 { font-size: 1.5rem; margin-top: 32px; margin-bottom: 16px; color: var(--rz-primary); }
    p, ul { font-size: 1.05rem; color: var(--rz-text-muted); margin-bottom: 16px; }
    ul { padding-left: 24px; }
    li { margin-bottom: 8px; }
    a { color: var(--rz-primary); text-decoration: underline; }

    /* --- MOBILE RESPONSIVENESS --- */
    @media (max-width: 600px) {
      .legal-container {
        margin: 24px auto;
        padding: 16px;
      }
      h1 { 
        font-size: 2rem; 
      }
      h2 { 
        font-size: 1.25rem; 
        margin-top: 24px; 
      }
      p, ul { 
        font-size: 1rem; 
      }
    }
  `]
})
export default class TermsComponent {}