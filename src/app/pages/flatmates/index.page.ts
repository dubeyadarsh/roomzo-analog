import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Flatmate {
  id: string;
  name: string;
  age: number;
  gender: string;
  profession: string;
  budget: string;
  targetLocations: string[];
  bio: string;
  images: string[];
  preferences: string[];
listingStatus: 'Needs Flatmate' | 'Needs a Room';}

@Component({
  selector: 'app-flatmates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flatmates.html',
  styleUrls: ['./flatmates.css']
})
export default class FlatmatesComponent {
  flatmates: Flatmate[] = [
    {
      id: '1',
      name: 'Aarav',
      age: 26,
      gender: 'Male',
      profession: 'Software Engineer',
      budget: '₹15k - ₹20k',
      targetLocations: ['Andheri West', 'Bandra'],
      bio: 'Clean, organized, and usually working late. I enjoy a quiet environment during the weekdays and exploring cafes on weekends.',
      images: [
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
      ],
      preferences: ['Non-Smoker', 'Pet Friendly', 'Vegetarian'],
      listingStatus: 'Needs Flatmate'
      
    },
    {
      id: '2',
      name: 'Priya',
      age: 24,
      gender: 'Female',
      profession: 'UX Designer',
      budget: '₹18k - ₹25k',
      targetLocations: ['Powai', 'Vikhroli'],
      bio: 'Looking for a chill flatmate to share a 2BHK. I love plants, keeping the common areas aesthetic, and occasional movie nights.',
      images: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
      ],
      preferences: ['Early Riser', 'Clean Freak', 'No Pets'],
      listingStatus: 'Needs a Room'
    },
    {
      id: '3',
      name: 'Rohan',
      age: 28,
      gender: 'Male',
      profession: 'Marketing',
      budget: '₹20k - ₹30k',
      targetLocations: ['South Mumbai', 'Lower Parel'],
      bio: 'Easy-going and social. I travel for work quite a bit, so I am out of town a few days a month.',
      images: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80'
      ],
      preferences: ['Gym Bro', 'Occasional Drinker', 'Foodie'],
      listingStatus: 'Needs Flatmate'
    },
    {
      id: '4',
      name: 'Neha',
      age: 25,
      gender: 'Female',
      profession: 'Finance',
      budget: '₹12k - ₹16k',
      targetLocations: ['Malad', 'Goregaon'],
      bio: 'Strictly looking for a female flatmate. I respect privacy and boundaries, pay bills on time, and expect the same.',
      images: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80'
      ],
      preferences: ['Non-Smoker', 'Quiet', 'Vegetarian'],
      listingStatus: 'Needs a Room'
    }
  ];
  scrollToTop() {
    const feed = document.querySelector('.feed-container');
    if (feed) {
      feed.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}