import { Content } from './content';
import { querySelector, Sites, Track } from './exports';
import Hls from 'hls.js';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css'

const HlsSupport = {
    None: 'none',
    Native: 'native',
    Library: 'library',
} as const;

class Berriz extends Content {
    private readonly name = Sites.Berriz;
    private readonly videoSelector: string = 'video.berriz-webplayer';
    private cmap = new Map<string, string>();
    private notyf = new Notyf({duration: 10000, dismissible: true, position: {x: 'center', y: 'bottom'}});
    private hasHls: string = HlsSupport.None;
    private page = '';

    constructor() {
        super();
        this.checkHlsSupport();
        console.debug('commasubs: HLS support ' + this.hasHls);
        if (this.hasHls !== HlsSupport.None) {
            this.start(this.name);
        } else {
            this.notyf.error('Your browser does not support HLS playback.');
        }
    }

    protected getMediaId(url: string): string {
        return this._getMediaId(this.name, this.getIdFromUrl(url));
    }

    protected setTrack(track: Track): void {
        const v = this.getVideoElement(this.videoSelector);
        if (v) {
            this._setTrack(v, track);
        }
    }

    protected async getVideoSize(): Promise<[number, number]> {
        return this._getVideoSize(this.videoSelector);
    }

    protected getExtraStyles(): string {
        const extra = [
            '.berriz-webplayer{aspect-ratio: 16 / 9;margin:10px;margin-top:0;max-height:calc(100vh - 60px)}',
        ];

        return extra.join('');
    }

    protected isMobile(): boolean {
        return false;
    }

    protected checkHlsSupport(): void {
        const video = document.createElement('video');
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            this.hasHls = HlsSupport.Native;
        } else if (Hls.isSupported()) {
            this.hasHls = HlsSupport.Library;
        }
        return;
    }

    protected getIdFromUrl(url: string): string {
        // https://berriz.in/en/IVE/live/replay/01973858-e24f-b403-d382-b559ddc1f92d/
        const u = new URL(url);
        return u.pathname.split('/')[5];
    }

    protected onPageChanged(): void {
        this.resetBadge();
        this.hideTrack();
    }

    protected onVideoFound(url: string): void {
        console.debug('commasubs: found video.');
        const key = this.getMediaId(url);
        this.loadVideoManifest(key)
            .then(data => {
                this.maybeShowTrack(data);
                const lngs = this.smap.get(key) || [];
                this.setBadge(lngs.length);
            });
    }

    protected observeContentChange(): void {
        let foundVideo = false, hideModal = true;

        // We need to check when page was loaded on a video page.
        if (window.location.pathname.includes('/live/replay/')) {
            querySelector<HTMLElement>('main', el => {
                this.loadVideo(el, window.location);
            });
            querySelector<HTMLElement>('div.muscat-ui-modal-layer', el => {
                el.classList.add('hidden');
            });
        }

        new MutationObserver((mutations, obs) => {
            const u = window.location;

            if (this.page !== u.pathname) {
                foundVideo = false;
                hideModal = true;
                this.page = u.pathname;
                this.onPageChanged();
            }

            // live section only
            const parts = u.pathname.split('/');
            if (!(parts.length > 5 && parts[3] == 'live' && parts[4] == 'replay')) {
                return;
            }

            mutations.forEach(m => {
                // When a video element is added to DOM start observing resizes.
                // Even when auto check for subtitles is disabled still use our styles for cues
                // since we can use our styling for their own subtitles.
                m.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const n = <Element>node;
                        // Check if added node is our video or if the video is a child of the added node.
                        if (n.nodeName === 'MAIN') {
                            this.loadVideo(n, u);
                            foundVideo = false;
                        } else {
                            const vn = n.querySelector('main');
                            if (vn) {
                                this.loadVideo(vn, u);
                                foundVideo = false;
                            }
                        }
                        if (n.nodeName === 'DIV' && n.classList.contains('muscat-ui-modal-layer') && hideModal) {
                            n.classList.add('hidden');
                            hideModal = false;
                        }
                    }
                });

                // If auto check is disabled don't continue.
                if (!this.optAutoCheck) {
                    return;
                }

                // page with a video
                if (!foundVideo) {
                    querySelector<HTMLVideoElement>(this.videoSelector, el => {
                        foundVideo = true;
                        this.onVideoFound(u.toString());
                    });
                }
            });
        }).observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    protected async loadVideo(el: Element, u: Location) {
        let video = document.querySelector<HTMLVideoElement>(this.videoSelector);
        if (!video) {
            video = document.createElement('video');
            video.classList.add('berriz-webplayer');
            video.setAttribute('controls', '');
            el.appendChild(video);
        }

        this.observeVideoResize(video, true);
        const id = this.getIdFromUrl(u.toString());

        if (!this.cmap.has(id)) {
            const url = [
                'https://svc-api.berriz.in/service/v1/medias/live/replay', id, 'playback_area_context'
            ].join('/') + '?languageCode=en';
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'include',
            });
            if (!response.ok) {
                this.notyf.error(`${response.status}: Error loading video info. Are you logged in?`);
                throw new Error(`Response status: ${response.status}`);
            }
            const data = await response.json();
            if (data.code !== '0000') {
                this.notyf.error(data.message);
                throw new Error(`${data.code}: ${data.message}`);
            }
            this.cmap.set(id, data.data?.media?.live?.replay?.hls?.playbackUrl || '');
        }

        const src = this.cmap.get(id) || '';

        if (this.hasHls === HlsSupport.Native) {
            video.src = src;
            video.preload = 'metadata';
            video.addEventListener('loadedmetadata', function () {
                video.currentTime = 0.001;
            });
            return;
        }

        if (this.hasHls === HlsSupport.Library) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, function () {
                video.play();
            });
            return;
        }

        return;
    }
}

new Berriz();
