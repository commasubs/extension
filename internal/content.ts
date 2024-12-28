import { encodeURI } from 'js-base64';
import { LRUMap } from 'lru_map';
import * as browser from './browser';
import { Action, defOptions, getStyles, Manifest, Message, Options, TextMessage, Track, TrackMessage } from './exports';

export abstract class Content {
    // @ts-ignore
    protected host: string = build.CDN_URL;
    protected smap = new Map<string, string[]>();
    protected mmap = new LRUMap<string, Manifest>(10);
    protected optLanguage: string = defOptions.language;
    protected optAutoShow: boolean = false;
    protected optAutoCheck: boolean = false;
    private readonly beforeUnloadListener: EventListener;
    private beforeUnloadActive = false;

    protected abstract setTrack(track: Track): void;

    protected abstract getMediaId(url: string): string;

    protected abstract getVideoSize(): [number, number];

    protected abstract observeContentChange(): void;

    protected constructor() {
        this.beforeUnloadListener = () => this.beforeUnload();
        this.listen();
        browser.storage.local.get(defOptions).then((value) => {
            const opt = (value as Options);
            this.optLanguage = opt.language;
            this.optAutoShow = opt.autoShow == 'on';
            this.optAutoCheck = opt.autoCheck == 'on';

            if (!this.optAutoCheck) {
                console.debug(`commasubs: autoCheck is disabled, not looking for subtitles.`);
            }
            this.observeContentChange();
        });

    }

    protected _getMediaId(service: string, key: string): string {
        return encodeURI(`${service}:${key}`);
    }

    protected _setTrack(v: HTMLVideoElement, track: Track): void {
        v.crossOrigin = 'anonymous';

        this.addCueStyles();
        const src = `${this.host}/t/${track.id}/${track.id}-${track.langcode}-${track.updated.toString(16)}.vtt`;

        let t = document.querySelector<HTMLTrackElement>('track[data-commasubs]');
        if (!t) {
            t = document.createElement('track');
            t.dataset.commasubs = '';
            t.default = true;
            t.kind = 'subtitles';
            t.label = track.langname;
            t.srclang = track.langcode;
            t.src = src;
            v.appendChild(t);
        } else {
            t.label = track.langname;
            t.srclang = track.langcode;
            t.src = src;
            t.track.mode = 'showing';
        }
    }

    protected hideTrack(): void {
        document.querySelectorAll<HTMLTrackElement>('track[data-commasubs]').forEach(el => {
            el.track.mode = 'hidden';
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
        if (this.mmap.has(key)) {
            return this.mmap.get(key) || <Manifest>{};
        }

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
        this.mmap.set(key, data);

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
            const [w, h] = this.getVideoSize();
            this.setStyles(getStyles((value as Options).captions, w, h));
        });
    }

    private setStyles(txt: string): void {
        // console.log('setStyles', txt);
        let el = document.querySelector<HTMLStyleElement>('#wv-cue-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'wv-cue-style';
            document.head.append(el);
        }
        el.textContent = `::cue{${txt}}`;
    }

    private listen(): void {
        browser.runtime.onMessage.addListener((msg, sender, sendResponse): true | Promise<unknown> | undefined => {
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
                if (changed['autoCheck']) {
                    this.optAutoCheck = changed['autoCheck'].newValue == 'on';
                }
            }
        });
    }
}
