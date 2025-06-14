import { encodeURI } from 'js-base64';
import * as browser from './browser';
import {
    Action, defOptions, getStyles, Manifest, Message, Options, Site, Sites, TextMessage, Track, TrackMessage
} from './exports';

export abstract class Content {
    // @ts-ignore
    protected host: string = build.CDN_URL;
    protected smap = new Map<string, string[]>();
    protected optLanguage: string = defOptions.language;
    protected optAutoShow: boolean = false;
    protected optAutoCheck: boolean = false;
    private readonly beforeUnloadListener: EventListener;
    private beforeUnloadActive = false;
    private resizeTimeoutId = 0;
    private trackSelector = 'track[data-commasubs]';

    protected abstract setTrack(track: Track): void;

    protected abstract getMediaId(url: string): string;

    protected abstract getVideoSize(): Promise<[number, number]>;

    protected abstract getExtraStyles(): string;

    protected abstract isMobile(): boolean;

    protected abstract observeContentChange(): void;

    protected constructor() {
        this.beforeUnloadListener = () => this.beforeUnload();
    }

    protected _getMediaId(service: string, key: string): string {
        return encodeURI(`${service}:${key}`);
    }

    protected _setTrack(v: HTMLVideoElement, track: Track): void {
        let t = document.querySelector<HTMLTrackElement>(this.trackSelector);
        if (t && t.track.id === track.id) {
            // Do not try to add the same track.
            return;
        }
        if (t) {
            t.remove();
        }

        this.addCueStyles();
        const src = `${this.host}/t/${track.id}/${track.id}-${track.langcode}-${track.updated.toString(16)}.vtt`;
        // const empty = URL.createObjectURL(new Blob(['WEBVTT'], {type: 'text/vtt'}));

        window
            .fetch(src)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.blob();
            })
            .then((data) => {
                t = document.createElement('track');
                t.dataset.commasubs = '';
                t.id = track.id;
                t.default = true;
                t.kind = 'subtitles';
                t.label = track.langname;
                t.srclang = track.langcode;
                t.src = URL.createObjectURL(data);
                v.replaceChildren(t);
                window.setTimeout(() => {
                    document.querySelectorAll<HTMLTrackElement>(this.trackSelector).forEach(el => {
                        el.track.mode = 'showing';
                    });
                }, 1000);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    protected async _getVideoSize(selector: string): Promise<[number, number]> {
        const v = this.getVideoElement(selector);
        if (v) {
            // @ts-ignore custom for iPhone
            if (v.webkitDisplayingFullscreen && v.webkitPresentationMode === 'fullscreen') {
                const s = window.screen;
                if (s.orientation.type.startsWith('portrait')) {
                    return [s.width * window.devicePixelRatio, s.height * window.devicePixelRatio];
                }
                return [s.height * window.devicePixelRatio, s.width * window.devicePixelRatio];
            }
            // @ts-ignore custom for iPad
            if (v.webkitDisplayingFullscreen && v.webkitPresentationMode === 'picture-in-picture') {
                try {
                    const pip = await v.requestPictureInPicture();
                    return [pip.width * window.devicePixelRatio, pip.height * window.devicePixelRatio];
                } catch (e) {
                }
            }
            return [v.clientWidth, v.clientHeight];
        }
        return [640, 480];
    }

    protected start(site: Site) {
        console.debug(`commasubs: ${site} loaded.`);
        this.listen();
        browser.storage.local.get(defOptions).then((value) => {
            const opt = (value as Options);
            this.optLanguage = opt.language;
            this.optAutoShow = opt.autoShow == 'on';

            switch (site) {
                case Sites.Berriz:
                    this.optAutoCheck = opt.berriz.autoCheck == 'on';
                    break;
                case Sites.YouTube:
                    this.optAutoCheck = opt.youtube.autoCheck == 'on';
                    break;
                case Sites.Weverse:
                    this.optAutoCheck = opt.weverse.autoCheck == 'on';
            }

            if (!this.optAutoCheck) {
                console.debug(`commasubs: autoCheck is disabled, not looking for subtitles.`);
            }
            this.observeContentChange();
        });
    }

    protected hideTrack(): void {
        document.querySelectorAll<HTMLTrackElement>(this.trackSelector).forEach(el => {
            //el.track.mode = 'hidden';
            el.remove();
        });
    }

    protected getVideoElement(id: string): HTMLVideoElement | null {
        const v = document.querySelector<HTMLVideoElement>(id);
        if (!v) {
            console.warn('commasubs: video element not found.');
        }
        return v;
    }

    protected makeLabel(langs: string[], max: number): string {
        let lbl = '(cc: ';

        if (langs.length === 0) {
            lbl += '×';
        } else if (langs.length > max) {
            lbl += langs.slice(0, max).join(', ') + ', …';
        } else {
            lbl += langs.join(', ');
        }

        lbl += ')';

        return lbl;
    }

    protected async loadVideoManifest(key: string): Promise<Manifest> {
        const url = [this.host, 'm', key, 'manifest.json'].join('/');

        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                this.smap.set(key, []);
                return <Manifest>{};
            }
            throw new Error(`Response status: ${response.status}`);
        }

        const data: Manifest = await response.json();
        const lngs: string[] = [];

        if (data.subtitles && data.subtitles.length > 0) {
            data.subtitles.forEach(sub => {
                lngs.push(sub.langcode);
            });
        }

        this.smap.set(key, lngs);

        return data;
    }

    protected maybeShowTrack(m: Manifest): void {
        if (!this.optAutoShow) {
            return;
        }
        const track = this.findTrack(this.optLanguage, m.subtitles);
        if (track) {
            // console.log('auto enabling track', track);
            this.setTrack(track);
        }
    }

    protected setBadge(count: number) {
        browser.runtime.sendMessage(<TextMessage>{action: Action.SetBadge, text: count.toString()});

        if (!this.beforeUnloadActive) {
            window.addEventListener('beforeunload', this.beforeUnloadListener, false);
            this.beforeUnloadActive = true;
        }
    }

    protected resetBadge(): void {
        if (this.beforeUnloadActive) {
            browser.runtime.sendMessage(<TextMessage>{action: Action.SetBadge, text: ''});
            window.removeEventListener('beforeunload', this.beforeUnloadListener, false);
            this.beforeUnloadActive = false;
        }
    }

    protected observeVideoResize(el: Element | null, runOnStart = false): void {
        if (el === null) {
            return;
        }
        if (runOnStart) {
            this.addCueStyles();
        }
        // For iPhone fullscreen change. There is no resize event when going to/from fullscreen.
        // For iPad picture-in-picture.
        el.addEventListener("webkitpresentationmodechanged", (e) => {
            this.addCueStyles();
        });
        new ResizeObserver((m) => {
            window.clearTimeout(this.resizeTimeoutId);
            this.resizeTimeoutId = window.setTimeout(() => this.addCueStyles(), 500);
        }).observe(el);
    }

    private findTrack(lang: string, tracks: Track[]): Track | undefined {
        const h = new Map<string, Track>();
        const m = new Map<string, Track>();

        // split tracks per generator to look for human subtitles first
        tracks.forEach(track => {
            if (track.generator.toLowerCase() === 'human') {
                h.set(track.langcode, track);
            }
            if (track.generator.toLowerCase() === 'machine') {
                m.set(track.langcode, track);
            }
        });

        // try exact match
        if (h.has(lang)) {
            return h.get(lang);
        }
        if (m.has(lang)) {
            return m.get(lang);
        }

        // try match by prefix
        for (const [_, track] of h) {
            if (track.langcode.startsWith(lang)) {
                return track;
            }
        }
        for (const [_, track] of m) {
            if (track.langcode.startsWith(lang)) {
                return track;
            }
        }

        // not found
        return;
    }

    private beforeUnload(): void {
        this.resetBadge();
    }

    private addCueStyles(): void {
        browser.storage.local.get(defOptions).then((value) => {
            this.getVideoSize().then(([w, h]) => {
                // console.debug(`commasubs: [w:${w}, h:${h}]`);
                this.setStyles(getStyles((value as Options).captions, w, h));
            });
        });
    }

    private setStyles(txt: string): void {
        // console.debug('commasubs: set cue styles.');
        let el = document.querySelector<HTMLStyleElement>('#wv-cue-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'wv-cue-style';
            document.head.append(el);
        }
        el.textContent = txt + this.getExtraStyles();
    }

    private listen(): void {
        // @ts-ignore return true for async sendResponse
        browser.runtime.onMessage.addListener((msg, sender, sendResponse): true | undefined => {
            switch ((msg as Message).action) {
                case Action.GetManifest:
                    this.loadVideoManifest(this.getMediaId(window.location.href)).then(manifest => {
                        sendResponse(manifest);
                    });
                    return true;
                case Action.SetTrack:
                    this.setTrack((msg as TrackMessage).track);
                    break;
                case Action.DelTrack:
                    this.hideTrack();
                    break;
            }
        });

        browser.storage.onChanged.addListener((changed, area) => {
            if (area == 'local') {
                if (changed['captions']) {
                    this.addCueStyles();
                }
                if (changed['language']) {
                    this.optLanguage = changed['language'].newValue as string;
                }
                if (changed['autoShow']) {
                    this.optAutoShow = changed['autoShow'].newValue == 'on';
                }
            }
        });
    }
}
