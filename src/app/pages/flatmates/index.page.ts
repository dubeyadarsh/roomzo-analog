import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlatmateService } from "../../services/flatmate.service";
import {environment} from "../../environments/environment";
import {MatIconModule} from "@angular/material/icon";
@Component({
  selector: 'app-flatmates',
  standalone: true,
  imports: [CommonModule,MatIconModule],
  templateUrl: './flatmates.html',
  styleUrls: ['./flatmates.css']
})
export default class FlatmatesComponent implements OnInit {
  flatmates: any[] = [];
  loading = false;
  loadingMore = false;
  page = 0;
  size = 10;
  hasMore = true;
  latitude?: number;
  longitude?: number;

  private readonly CACHE_KEY = 'flatmate_feed_cache_v1';
  
  // 🔴 UPDATE THIS WITH YOUR HOSTINGER UPLOAD DOMAIN
  private readonly HOSTINGER_URL = 'https://YOUR-HOSTINGER-DOMAIN.com'; 

  constructor(private flatmateService: FlatmateService) { }

  ngOnInit(): void {
    this.loadCache();
    this.loadMemoryFeed();
    this.initializeLocation();
  }

 

  // --- Cache ---
  loadCache() {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (cached) {
      this.flatmates = JSON.parse(cached);
    }
  }

  saveCache() {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.flatmates));
  }

  // --- Feeds ---
  loadMemoryFeed() {
    this.loading = true;
    this.flatmateService.getMemoryFeed().subscribe({
      next: (res: any) => {
        const posts = res?.data || [];
        if (posts.length) {
          this.flatmates = posts;
          this.saveCache();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  initializeLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.loadMorePosts();
      },
      () => { console.log('Location permission denied'); }
    );
  }

  loadMorePosts() {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;

    this.flatmateService.getNearbyFeed(this.page, this.size, this.latitude, this.longitude).subscribe({
      next: (res: any) => {
        const posts = res?.data?.content || [];
        if (posts.length < this.size) this.hasMore = false;

        const existingIds = new Set(this.flatmates.map(x => x.id));
        const uniquePosts = posts.filter((x: any) => !existingIds.has(x.id));

        this.flatmates = [...this.flatmates, ...uniquePosts];
        this.saveCache();
        this.page++;
        this.loadingMore = false;
      },
      error: () => { this.loadingMore = false; }
    });
  }

  // --- Interaction ---
  onScroll(event: any) {
    const element = event.target;
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining < 1200) this.loadMorePosts();
  }

  scrollToTop() {
    const feed = document.querySelector('.feed-container');
    if (feed) feed.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get allCaughtUp() {
    return !this.hasMore && this.flatmates.length > 0;
  }

  trackByPostId(index: number, item: any) {
    return item.id;
  }
  getImageUrl(dbPath: string): string {
    if (!dbPath) return 'assets/images/flatmate-placeholder.jpg';
    if (dbPath.startsWith('http')) return dbPath; // Already a full URL

    // Use environment URL, fallback to roomzo.in if missing
    const baseUrl = environment.hostingerUploadUrl || 'https://roomzo.in';
    
    // Strip trailing slashes from base, and leading slashes from path to prevent '//'
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanPath = dbPath.replace(/^\/+/, '');

    return `${cleanBase}/${cleanPath}`;
  }

  imageError(event: Event): void {
    const element = event.target as HTMLImageElement;
    element.src = 'assets/images/flatmate-placeholder.jpg';
  }
}