import { Content } from './content';
import { querySelector, Track } from './exports';

class Youtube extends Content {
    private readonly name: string = 'youtube';
    private readonly videoSelector: string = 'video.html5-main-video';
    private page = '';

    constructor() {
        super();
        console.debug(`commasubs: ${this.name} loaded.`);
    }

    protected getMediaId(url: string): string {
        const u = new URL(url);
        return this._getMediaId(this.name, u.searchParams.get('v') || '');
    }

    protected setTrack(track: Track): void {
        const v = this.getVideoElement(this.videoSelector);
        if (v) {
            this._setTrack(v, track);
        }
    }

    protected getVideoSize(): [number, number] {
        const v = this.getVideoElement(this.videoSelector);
        if (v) {
            return [v.clientWidth, v.clientHeight];
        }
        return [640, 480];
    }

    protected getExtraStyles(): string {
        // Hide subtitles during ads.
        return '#movie_player.ad-showing video::cue{visibility:hidden}';
    }

    protected isMobile(): boolean {
        return window.location.hostname === 'm.youtube.com';
    }

    protected async addLabel(langs: string[]): Promise<void> {
        const el = document.createElement('div');
        el.dataset.commasubs = '';
        el.textContent = ' • ' + this.makeLabel(langs, 4);

        // wait for max 5s for the selector to appear
        let loop = 0;
        while (document.querySelector('#info-container.ytd-watch-info-text') === null) {
            await new Promise(r => setTimeout(r, 1000))
            if (++loop > 4) break;
        }

        document.querySelectorAll('#info-container div[data-commasubs]').forEach(el => el.remove());
        document.querySelector('#info-container')?.appendChild(el);
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
                this.addLabel(lngs);
            });
    }

    protected observeContentChange(): void {
        let foundVideo = false;

        new MutationObserver((mutations, obs) => {
            const u = new URL(window.location.href);
            const vid = u.searchParams.get('v') || '';

            if (this.page !== u.pathname + vid) {
                foundVideo = false;
                this.page = u.pathname + vid;
                this.onPageChanged();
            }

            // video page only
            if (u.pathname !== '/watch' || vid === '') {
                return;
            }

            mutations.forEach(m => {
                // Check if video node was added which could mean it was recreated
                // so we need to act like there was a new video added.
                m.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const n = <Element>node;
                        // Check if added node is our video or if the video is a child of the added node.
                        if (n.nodeName === 'VIDEO' && n.classList.contains('html5-main-video')) {
                            this.observeVideoResize(n, true);
                            foundVideo = false;
                        } else {
                            const vn = n.querySelector(this.videoSelector);
                            if (vn) {
                                this.observeVideoResize(n, true);
                                foundVideo = false;
                            }
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
}

new Youtube();
