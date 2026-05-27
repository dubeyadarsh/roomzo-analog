import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="legal-container">
      <h1>Privacy Policy</h1>
      <p><strong>Last Updated:</strong> May 2026</p>

      <h2>1. Introduction</h2>
      <p>Welcome to RoomZo. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and share information about you when you use our website.</p>

      <h2>2. Information We Collect</h2>
      <p>We collect information you provide directly to us when you register for an account, create a listing, or contact support. This may include your name, email address, phone number, and property details.</p>

      <h2>3. How We Use Your Information</h2>
      <p>We use the information we collect to operate, maintain, and provide the features of RoomZo, to communicate with you, and to monitor and analyze trends and usage.</p>

      <h2>4. Third-Party Advertising and Cookies (AdSense)</h2>
      <p>We use third-party advertising companies, including Google, to serve ads when you visit our website. These companies may use cookies to serve ads based on your prior visits to our website or other websites.</p>
      <ul>
        <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.</li>
        <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank">Ads Settings</a>.</li>
      </ul>

      <h2>5. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at support@roomzo.com.</p>
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
export default class PrivacyPolicyComponent {}