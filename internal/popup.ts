import { Action, Manifest, Message, querySelector, Track, TrackMessage } from './exports';
import * as browser from './browser';

class ExtensionPopup {
    constructor() {
        this.listen();
        this.getManifest();
    }

    private async getManifest() {
        const tabs = await browser.tabs.query({active: true, currentWindow: true});
        if (tabs.length > 0 && tabs[0].id) {
            const id = tabs[0].id;
            try {
                const resp: Manifest = await browser.tabs.sendMessage(id, {action: Action.GetManifest, payload: ''});
                console.log(id, resp);
                this.render(id, resp);
            } catch (e) {
                console.log(e);
                this.render(0, <Manifest>{});
            }
        }
    }

    private render(tabId: number, manifest: Manifest) {
        if (!manifest) {
            manifest = <Manifest>{};
        }

        const tpl = document.querySelector<HTMLTemplateElement>('#listrow');
        if (!tpl) return;

        querySelector<HTMLElement>('#loader', el => {
            el.style.display = 'none';
        });

        document.querySelector('#btn-off')?.addEventListener('click', (e) => {
            browser.tabs.sendMessage(tabId, <Message>{action: Action.DelTrack});
            window.close();
        });

        let subs: Track[] = [];
        let ulh: Element[] = [];
        let ulm: Element[] = [];

        if (manifest.subtitles && manifest.subtitles.length > 0) {
            subs = manifest.subtitles;
            // subs = [...subs, ...subs, ...subs, ...subs, ...subs, ...subs, ...subs, ...subs];
        }

        const dtf = new Intl.DateTimeFormat(undefined, {year: 'numeric', month: 'short', day: 'numeric'});

        subs.forEach(track => {
            const clone = tpl.content.cloneNode(true) as Element;
            const p = clone.querySelectorAll('p[data-id]');

            p.forEach(child => {
                const el = child as HTMLElement;

                switch (el.dataset.id) {
                    case 'code':
                        el.innerText = track.langcode.toUpperCase();
                        break;
                    case 'name':
                        el.innerText = track.langname;
                        break;
                    case 'team':
                        el.innerText = track.team;
                        break;
                    case 'updated':
                        el.innerText = dtf.format(new Date(track.updated * 1000));
                        break;
                }
            });

            clone.children[0].addEventListener('click', (e) => {
                browser.tabs.sendMessage(tabId, <TrackMessage>{action: Action.SetTrack, track: track});
                window.close();
            });

            if (track.generator.toLowerCase() === 'human') {
                ulh.push(clone);
            }
            if (track.generator.toLowerCase() === 'machine') {
                ulm.push(clone);
            }
        });

        if (ulh.length == 0 && ulm.length == 0) {
            return;
        }

        querySelector<HTMLElement>('ul#human-list', el => {
            ulh.forEach(c => el.appendChild(c));
            if (el.parentElement && ulh.length == 0) {
                el.parentElement.style.display = 'none';
            }
        });

        querySelector<HTMLElement>('ul#machine-list', el => {
            ulm.forEach(c => el.appendChild(c));
            if (el.parentElement && ulm.length == 0) {
                el.parentElement.style.display = 'none';
            }
        });
    }

    private listen() {
        document.querySelector('#btn-settings')?.addEventListener('click', () => {
            if (browser.runtime.openOptionsPage) {
                browser.runtime.openOptionsPage();
            } else {
                window.open(browser.runtime.getURL('content/options.html'));
            }
        });
    }
}

new ExtensionPopup();
