import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const SMART_LINK_SCRIPT_ID = 'adsterra-smartlink-script';
const SMART_LINK_SRC =
  'https://www.effectivecpmnetwork.com/t6j0i92x?key=a7f83df85a06f03e1e4d82f0fe1e3986';

@Injectable({ providedIn: 'root' })
export class AdsterraSmartLinkService {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (document.getElementById(SMART_LINK_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement('script');
    script.id = SMART_LINK_SCRIPT_ID;
    script.async = true;
    script.src = SMART_LINK_SRC;
    document.body.appendChild(script);
  }
}
