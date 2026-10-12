// Music station: long game-OST mixes through the YouTube IFrame API. The
// player is a 1×1 element offscreen; what you see is the disc in the dock.
//
// Behind an ad blocker the API script never arrives. After nine seconds the
// station flips to `failed` and says so instead of sitting dead.

export interface StationInfo { id: string; title: string; by: string; custom?: boolean }

export const STATIONS: StationInfo[] = [
  { id: 'ueRHznBxN8M', title: 'MapleStory Nostalgia',         by: '1 hr · early GMS tunes' },
  { id: 'y2M18LXBXPs', title: 'MapleStory for Studying',      by: '2 hr · hand-picked' },
  { id: '3DEkF2uvPoc', title: 'MapleStory 2006 GMS',          by: '2 hr · ripped from v0.22' },
  { id: 'c_X2JARomKM', title: 'More MapleStory for Studying', by: '2 hr' },
  { id: '9k9p_ykZiSU', title: 'MapleStory 2',                 by: '1 hr' },
  { id: 'AJu_6mtkTe0', title: 'OSRS Focus Mix',               by: '1 hr · Garden, Doorways, Forest' },
  { id: 'KBZnLqeYhgc', title: 'Relaxing OSRS',                by: '3 hr · study & sleep' },
  { id: '33aluIL_K3U', title: 'Classic OSRS',                 by: '2 hr' },
  { id: '5Vzc-KIawBI', title: 'OSRS Lofi',                    by: '1 hr · chill remixes' },
  { id: '84dPx9sP2Mg', title: 'OSRSBeatz Lofi',               by: 'lofi hip hop mix' },
  { id: 'wv-7hILtUI4', title: 'RuneScape OST Classics',       by: 'full album' },
];

interface YTPlayer {
  playVideo(): void; pauseVideo(): void; setVolume(v: number): void;
  loadVideoById(id: string): void; cueVideoById(id: string): void;
}
interface YTNamespace {
  Player: new (el: string | HTMLElement, opts: unknown) => YTPlayer;
}
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

export class Station {
  ready = false;
  failed = false;
  playing = false;
  idx = 0;
  vol = 45;
  ducked = false;
  custom: StationInfo[] = [];
  onChange: () => void = () => {};

  private player: YTPlayer | null = null;
  private pending: (() => void) | null = null;
  private booted = false;

  get list(): StationInfo[] { return [...STATIONS, ...this.custom]; }
  get current(): StationInfo { return this.list[this.idx] ?? STATIONS[0]; }

  /** Loads the API on first use rather than at page load: no third-party request until you want music. */
  boot() {
    if (this.booted) return;
    this.booted = true;
    const host = document.createElement('div');
    host.id = 'yt-host';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);

    const build = () => {
      if (!window.YT?.Player || this.player) return;
      this.player = new window.YT.Player('yt-host', {
        height: '1', width: '1', videoId: this.current.id,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            this.ready = true;
            this.applyVolume();
            const p = this.pending; this.pending = null; p?.();
            this.onChange();
          },
          onStateChange: (e: { data: number }) => { this.playing = e.data === 1; this.onChange(); },
          onError: () => { this.failed = true; this.onChange(); },
        },
      });
    };
    if (window.YT?.Player) build();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); build(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { this.failed = true; this.onChange(); };
      document.head.appendChild(s);
      setTimeout(() => { if (!this.player) { this.failed = true; this.onChange(); } }, 9000);
    }
  }

  private run(fn: () => void) {
    this.boot();
    if (this.player && this.ready) fn(); else this.pending = fn;
  }

  load(i: number, autoplay = this.playing) {
    const L = this.list;
    this.idx = ((i % L.length) + L.length) % L.length;
    const id = L[this.idx].id;
    this.run(() => { if (autoplay) this.player!.loadVideoById(id); else this.player!.cueVideoById(id); });
    this.onChange();
  }

  toggle() {
    this.run(() => { if (this.playing) this.player!.pauseVideo(); else this.player!.playVideo(); });
  }

  setVolume(v: number) { this.vol = v; this.applyVolume(); this.onChange(); }

  duck(on: boolean) {
    if (on === this.ducked) return;
    this.ducked = on;
    this.applyVolume();
  }

  private applyVolume() {
    if (this.player && this.ready) this.player.setVolume(this.ducked ? Math.round(this.vol * 0.25) : this.vol);
  }

  add(id: string): string | null {
    if (this.list.some((s) => s.id === id)) return 'Already in the list.';
    this.custom.push({ id, title: 'Your station', by: 'added by you', custom: true });
    this.load(this.list.length - 1, this.playing);
    return null;
  }

  remove(id: string) {
    const cur = this.current.id;
    this.custom = this.custom.filter((s) => s.id !== id);
    const at = this.list.findIndex((s) => s.id === cur);
    if (at >= 0) this.idx = at; else this.load(0, this.playing);
    this.onChange();
  }
}
