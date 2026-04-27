import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

interface FaqItem {
  question: string;
  answer: string;
  category: 'General' | 'Tenants' | 'Owners';
  isOpen?: boolean; // For accordion toggle
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './faq.html',
  styleUrls: ['./faq.css']
})
export default class FaqComponent {
  constructor(private router: Router) {}
  // Default selected category
  activeCategory: string = 'General';

  // Full list of FAQs
  allFaqs: FaqItem[] = [
    // --- GENERAL ---
    {
      question: 'What is Roomzo?',
      answer: 'Roomzo is a premium property rental platform connecting verified homeowners with tenants looking for quality stays. We simplify the rental process with verified listings and direct communication.',
      category: 'General'
    },
    {
      question: 'Is Roomzo free to use?',
      answer: 'Yes! Browsing listings and contacting agents is completely free for tenants. Property owners pay a small fee only when they want to feature their listing.',
      category: 'General'
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can reach out to our 24/7 support team via the "Contact Us" page or email us directly at support@roomzo.com.',
      category: 'General'
    },

    // --- FOR TENANTS ---
    {
      question: 'Is Roomzo truly no-broker?',
      answer: 'Yes — Roomzo offers direct owner contact with zero brokerage or hidden fees.',
      category: 'Tenants'
    },
    {
      question: 'Are the listings reliable?',
      answer: 'We focus on genuine listings with clear details, so you rent with confidence.',
      category: 'Tenants'
    },
    // {
    //   question: 'Can I cancel a booking request?',
    //   answer: 'Yes, you can cancel a booking request from your dashboard at any time before the owner accepts it. Once accepted, cancellation policies depend on the specific lease agreement.',
    //   category: 'Tenants'
    // },

    // --- FOR OWNERS ---
    // {
    //   question: 'How do I list my property?',
    //   answer: 'Sign up as an owner, go to your dashboard, and click "Add New Listing". You will need to upload photos, provide property details, and submit proof of ownership for verification.',
    //   category: 'Owners'
    // },
    // {
    //   question: 'How long does verification take?',
    //   answer: 'Our team typically reviews new listings within 24-48 hours. You will receive a notification once your property is live on the platform.',
    //   category: 'Owners'
    // },
    // {
    //   question: 'Can I edit my listing after posting?',
    //   answer: 'Yes, you can edit details, update photos, or change the rent price at any time from your "My Listings" dashboard.',
    //   category: 'Owners'
    // }
  ];

  // Get filtered list based on active tab
  get displayFaqs() {
    return this.allFaqs.filter(f => f.category === this.activeCategory);
  }

  // Set active tab
  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  // Toggle individual accordion item
  toggleItem(item: FaqItem) {
    item.isOpen = !item.isOpen;
  }
    goToContact() {
    // valid navigation
this.router.navigate(['/'], { fragment: 'contactUs' });
  }
}