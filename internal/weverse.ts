import { Content } from './content';
import { querySelector, Sites, Track } from './exports';

class Weverse extends Content {
    private readonly name = Sites.Weverse;
    private readonly videoSelector: string = 'video.webplayer-internal-video';
    private page = '';

    constructor() {
        super();
        this.start(this.name);
    }

    protected getMediaId(url: string): string {
        const u = new URL(url);
        return this._getMediaId(this.name, u.pathname.substring(1));
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
        if (this.isMobile()) {
            return '';
        }
        // Hide weverse own subtitles to prevent duplicates when displaying native subtitles.
        return '.pzp-pc-subtitle-text,.pzp-pc__subtitle-text{display:none!important}';
    }

    protected isMobile(): boolean {
        return window.location.hostname === 'm.weverse.io';
    }

    protected addLabel(parent: HTMLElement, langs: string[]): void {
        const span = document.createElement('span');
        span.dataset.commasubs = '';
        span.textContent = ' • ' + this.makeLabel(langs, 4);
        parent.querySelectorAll('span[data-commasubs]').forEach(el => el.remove());
        parent.appendChild(span);
    }

    protected loadLabels(el: HTMLElement, selector: string): void {
        el.querySelectorAll<HTMLAnchorElement>(':scope > a[href]').forEach(n => {
            const s = n.querySelector<HTMLElement>(selector);
            if (!s) {
                return;
            }
            const key = this.getMediaId(n.href);
            if (this.smap.has(key)) {
                this.addLabel(s, this.smap.get(key) || []);
                return;
            }
            this.loadVideoManifest(key)
                .then(() => this.addLabel(s, this.smap.get(key) || []));
        });
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
                // Logged out.
                querySelector<HTMLElement>('[class^=\'MobileLiveArtistProfileView_artist_wrap__\']:last-child', el => {
                        this.addLabel(el, lngs);
                    });
                // Logged in.
                querySelector<HTMLElement>('[class^=\'HeaderView_artist_wrap__\'] [class^=\'LiveArtistProfileView_info__\']:last-child', el => {
                        this.addLabel(el, lngs);
                    });
            });
    }

    protected observeContentChange(): void {
        let foundVideo = false, foundVideoList = false, foundLiveList = false;

        new MutationObserver((mutations, obs) => {
            const u = window.location;

            if (this.page !== u.pathname) {
                foundVideo = foundVideoList = foundLiveList = false;
                this.page = u.pathname;
                this.onPageChanged();
            }

            // live section only
            const parts = u.pathname.split('/');
            if (parts.length < 2 || parts[2] !== 'live') {
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
                        if (n.nodeName === 'VIDEO' && n.classList.contains('webplayer-internal-video')) {
                            this.observeVideoResize(n, true);
                            this.keepShowingTracks();
                            foundVideo = false;
                        } else {
                            const vn = n.querySelector(this.videoSelector);
                            if (vn) {
                                this.observeVideoResize(vn, true);
                                this.keepShowingTracks();
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

                // list under a video
                if (!foundVideoList) {
                    querySelector<HTMLElement>('div[class^=\'MediaSlotView_package_list__\']', el => {
                        foundVideoList = true;
                        this.observeVideoList(el);
                    });
                }

                // live list
                if (!foundLiveList) {
                    querySelector<HTMLElement>('div[class^=\'LiveListView_live_list__\']', el => {
                        foundLiveList = true;
                        this.observeLiveList(el);
                    });
                }
            });
        }).observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    protected observeVideoList(el: HTMLElement): void {
        const callback = () => {
            this.loadLabels(el, 'span[class^=\'RelatedProductItemView_package_date__\']');
        };
        callback();
        new MutationObserver(() => callback()).observe(el, {childList: true});
    }

    protected observeLiveList(el: HTMLElement): void {
        const callback = () => {
            this.loadLabels(el, '[class^=\'LiveArtistProfileView_info_wrap__\'] [class^=\'LiveArtistProfileView_info__\']:last-child');
        };
        callback();
        new MutationObserver(() => callback()).observe(el, {childList: true});
    }

    private keepShowingTracks(): void {
        // Mobile site is using native subtitles.
        if (this.isMobile()) {
            return;
        }
        // Listen to addtrack event so we can set mode to showing for every added track.
        // This is needed because we hid weverse own subtitles.
        // This will show the browser native subtitles.
        const v = this.getVideoElement(this.videoSelector);
        if (v) {
            for (let textTrack of v.textTracks) {
                textTrack.mode = 'showing';
            }
            v.textTracks.addEventListener('addtrack', ev => {
                // @ts-ignore addtrack always have a track
                ev.track.mode = 'showing';
            })
        }
    }
}

new Weverse();
