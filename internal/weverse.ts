import { Content } from './content';
import { querySelector, Track } from './exports';

class Weverse extends Content {
    private readonly name = 'weverse';
    private readonly videoSelector: string = 'video.webplayer-internal-video';
    private page = '';

    constructor() {
        super();
        console.debug(`commasubs: ${this.name} loaded.`);
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

    protected getVideoSize(): [number, number] {
        const v = this.getVideoElement(this.videoSelector);
        if (v) {
            return [v.clientWidth, v.clientHeight];
        }
        return [640, 480];
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
        const key = this.getMediaId(url);
        this.loadVideoManifest(key)
            .then(data => {
                this.maybeShowTrack(data);
                const lngs = this.smap.get(key) || [];
                this.setBadge(lngs.length);
                querySelector<HTMLElement>('[class^=\'HeaderView_artist_wrap__\'] [class^=\'LiveArtistProfileView_info__\']:last-child', el => {
                    this.addLabel(el, lngs);
                });
            });
    }

    protected observeContentChange(): void {
        let foundVideo = false, foundVideoList = false, foundLiveList = false;

        new MutationObserver((mutations, obs) => {
            const u = new URL(window.location.href);

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

            // if auto check disabled look only for page changes
            if (!this.optAutoCheck) {
                return;
            }

            mutations.forEach(m => {
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
}

new Weverse();
