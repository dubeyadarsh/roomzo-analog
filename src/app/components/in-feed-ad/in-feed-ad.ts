import {
  Component,
  Inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

const NATIVE_CONTAINER_ID = 'container-8d25487206142db0ba8dd73e93853ca4';
const NATIVE_SCRIPT_ID = 'adsterra-native-script';
const NATIVE_SCRIPT_SRC =
  'https://pl30542103.effectivecpmnetwork.com/8d25487206142db0ba8dd73e93853ca4/invoke.js';
export const ADSTERRA_SMART_LINK_URL =
  'https://www.effectivecpmnetwork.com/t6j0i92x?key=a7f83df85a06f03e1e4d82f0fe1e3986';

@Component({
  selector: 'app-in-feed-ad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './in-feed-ad.html',
  styleUrls: ['./in-feed-ad.css'],
})
export class InFeedAdComponent implements OnDestroy {
  @Input({ required: true }) slotIndex = 0;

  readonly isBrowser: boolean;
  readonly nativeContainerId = NATIVE_CONTAINER_ID;
  readonly smartLinkUrl = ADSTERRA_SMART_LINK_URL;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      afterNextRender(() => {
        if (this.slotIndex === 0) {
          this.loadNativeScript();
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (!this.isBrowser || this.slotIndex !== 0) {
      return;
    }

    document.getElementById(NATIVE_SCRIPT_ID)?.remove();
  }

  private loadNativeScript(): void {
    if (!document.getElementById(NATIVE_CONTAINER_ID)) {
      return;
    }

    if (document.getElementById(NATIVE_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement('script');
    script.id = NATIVE_SCRIPT_ID;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = NATIVE_SCRIPT_SRC;
    document.body.appendChild(script);
  }
}
