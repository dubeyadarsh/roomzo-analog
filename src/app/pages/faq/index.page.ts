import { Component, OnInit, OnDestroy, Inject, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

// 1. ANALOG ROUTE META: Highly targeted for the UP region
export const routeMeta: RouteMeta = {
  title: 'Frequently Asked Questions | Roomzo - Brokerless Rentals UP',
  meta: [
    { 
      name: 'description', 
      content: 'Have questions about finding a room, PG, or flat in Prayagraj, Varanasi, or Lucknow? Read the Roomzo FAQ for a 100% agentless, trusted rental experience.' 
    },
    { 
      name: 'keywords', 
      content: 'room rent FAQ, how to find pg in varanasi, brokerless flat prayagraj, agentless roomzo, up rental platform' 
    }
  ]
};

interface FaqItem {
  question: string;
  answer: string;
  category: 'General' | 'Tenants' | 'Owners';
  isOpen?: boolean; 
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './faq.html',
  styleUrls: ['./faq.css']
})
export default class FaqComponent implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  activeCategory: string = 'General';

  // 2. EXPANDED FAQS: Kept your originals and added high-volume SEO questions
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
      answer: 'You can reach out to our 24/7 support team via the "Contact Us" page or email us directly at support@roomzo.in.',
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
    // NEW SEO TARGET: Prayagraj
    {
      question: 'How can I find a brokerless room for rent in Prayagraj?',
      answer: 'Roomzo lists hundreds of verified, agentless single rooms and flats in top Prayagraj locations like Katra, Civil Lines, and near Allahabad University. Simply use our search filter to connect directly with owners.',
      category: 'Tenants'
    },
    // NEW SEO TARGET: Varanasi
    {
      question: 'What are the best areas for students to rent a PG in Varanasi?',
      answer: 'For students, the most trusted areas in Varanasi are Lanka, Durgakund, and near the BHU campus. You can find highly-rated, affordable PGs in these areas directly on Roomzo.',
      category: 'Tenants'
    },
    // NEW SEO TARGET: Lucknow
  
    // --- FOR OWNERS ---
    // NEW SEO TARGET: Owners in UP
    {
      question: 'How do I list my property in Prayagraj or Varanasi without an agent?',
      answer: 'Sign up on Roomzo as an owner and click "Add New Listing". You can upload photos of your property in Prayagraj, Varanasi, or Lucknow and connect directly with verified tenants, completely bypassing broker commissions.',
      category: 'Owners'
    }
  ];

  ngOnInit() {
    this.injectFaqSchema();
  }

  ngOnDestroy() {
    this.removeFaqSchema();
  }

  // 3. DYNAMIC JSON-LD GENERATOR: Automatically creates schema for Google
  private injectFaqSchema() {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": this.allFaqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    const script = this.renderer.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'roomzo-faq-schema';
    script.text = JSON.stringify(schema);
    this.renderer.appendChild(this.document.head, script);
  }

  private removeFaqSchema() {
    const existingScript = this.document.getElementById('roomzo-faq-schema');
    if (existingScript) {
      this.renderer.removeChild(this.document.head, existingScript);
    }
  }

  get displayFaqs() {
    return this.allFaqs.filter(f => f.category === this.activeCategory);
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }

  toggleItem(item: FaqItem) {
    item.isOpen = !item.isOpen;
  }
  
  goToContact() {
    this.router.navigate(['/'], { fragment: 'contactUs' });
  }
}