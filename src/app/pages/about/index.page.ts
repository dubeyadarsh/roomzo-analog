import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export default class AboutComponent {
constructor(private router: Router) {}
  // Stats Data
  stats = [
    { label: 'Properties Sold', value: '5k+' },
    { label: 'Years Experience', value: '12+' },
    { label: 'Client Satisfaction', value: '98%' },
    { label: 'Active Agents', value: '250+' }
  ];

  // Values Data
  values = [
    { 
      icon: 'visibility', 
      title: 'Transparency', 
      desc: 'No brokers. No hidden fees. Clear information and honest listings, always..' 
    },
    { 
      icon: 'verified_user', 
      title: 'Integrity', 
      desc: 'Trust comes first. We stay fair, ethical, and user-focused in every decision.' 
    },
    { 
      icon: 'lightbulb', 
      title: 'Innovation', 
      desc: 'Smart technology for simple renting. Modern tools designed for speed, comfort, and ease.' 
    }
  ];

  // Team Data
  team = [
    { 
      name: 'David Chen', 
      role: 'Co-Founder & CEO', 
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80' 
    },
    { 
      name: 'Sarah Jenkins', 
      role: 'Head of Sales', 
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' 
    },
    { 
      name: 'Marcus Johnson', 
      role: 'Senior Broker', 
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80' 
    },
    { 
      name: 'Elena Rodriguez', 
      role: 'Marketing Director', 
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80' 
    }
  ];
  goToContact() {
    // valid navigation
this.router.navigate(['/'], { fragment: 'contactUs' });
  }
}