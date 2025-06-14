import * as browser from './browser';
import { defCaptions, defOptions, defSiteOptions, getStyles, Options, querySelector } from './exports';

class ExtensionOptions {
    constructor() {
        this.listen();
    }

    private saveOptions(): void {
        this.setStatus('Saving...');
        browser.storage.local.set(this.getOptions()).then(value => {
            this.setStatus('Saved.');
            setTimeout(() => {
                this.setStatus('');
            }, 1500);
        });
    }

    private restoreOptions(): void {
        browser.storage.local.get(defOptions).then((value) => {
            const opt = value as any;
            for (const key of Object.keys(opt.captions)) {
                this.setValue(key, opt.captions[key]);
            }
            if (opt.language) {
                this.setValue('language', opt.language);
            }
            if (opt.autoShow) {
                this.setChecked('autoShow', opt.autoShow);
            }
            if (opt.berriz.autoCheck) {
                this.setChecked('berrizAutoCheck', opt.berriz.autoCheck);
            }
            if (opt.youtube.autoCheck) {
                this.setChecked('youtubeAutoCheck', opt.youtube.autoCheck);
            }
            if (opt.weverse.autoCheck) {
                this.setChecked('weverseAutoCheck', opt.weverse.autoCheck);
            }
            this.redrawCaption();
        });
    }

    private redrawCaption(): void {
        this.setStyles(getStyles(this.getOptions().captions, 640, 480).replace('video::cue', '#cue'));
    }

    private getOptions(): Options {
        let opt: Options = {
            language: defOptions.language,
            autoShow: defOptions.autoShow,
            captions: {
                fontFamily: defCaptions.fontFamily,
                fontSize: defCaptions.fontSize,
                textColor: defCaptions.textColor,
                textOpacity: defCaptions.textOpacity,
                bgColor: defCaptions.bgColor,
                bgOpacity: defCaptions.bgOpacity,
            },
            berriz: {
                autoCheck: defSiteOptions.autoCheck,
            },
            youtube: {
                autoCheck: defSiteOptions.autoCheck,
            },
            weverse: {
                autoCheck: defSiteOptions.autoCheck,
            }
        };

        document.querySelectorAll<HTMLSelectElement>('select').forEach((el) => {
            switch (el.id) {
                case 'language':
                    opt.language = el.value;
                    break;
                case 'autoShow':
                    opt.autoShow = el.value;
                    break;
                case 'fontFamily':
                    opt.captions.fontFamily = el.value;
                    break;
                case 'fontSize':
                    opt.captions.fontSize = el.value;
                    break;
                case 'textColor':
                    opt.captions.textColor = el.value;
                    break;
                case 'textOpacity':
                    opt.captions.textOpacity = el.value;
                    break;
                case 'bgColor':
                    opt.captions.bgColor = el.value;
                    break;
                case 'bgOpacity':
                    opt.captions.bgOpacity = el.value;
                    break;
            }
        });

        document.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((el) => {
            console.log(el.id, el.checked, el.value);
            switch (el.id) {
                case 'autoShow':
                    opt.autoShow = el.checked ? 'on' : 'off';
                    break;
                case 'berrizAutoCheck':
                    opt.berriz.autoCheck = el.checked ? 'on' : 'off';
                    break;
                case 'youtubeAutoCheck':
                    opt.youtube.autoCheck = el.checked ? 'on' : 'off';
                    break;
                case 'weverseAutoCheck':
                    opt.weverse.autoCheck = el.checked ? 'on' : 'off';
                    break;
            }
        });

        return opt;
    }

    private setStatus(txt: string): void {
        querySelector('#status', el => {
            el.textContent = txt;
        });
    }

    private setValue(id: string, value: string): void {
        querySelector<HTMLSelectElement>('#' + id, el => {
            el.value = value;
        });
    }

    private setChecked(id: string, value: string): void {
        querySelector<HTMLInputElement>('#' + id, el => {
            el.checked = value == 'on';
        });
    }

    private setStyles(txt: string): void {
        let el = document.querySelector<HTMLStyleElement>('#wv-cue-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'wv-cue-style';
            document.head.append(el);
        }
        el.textContent = txt;
    }

    private listen(): void {
        document.querySelectorAll('select').forEach((el) => {
            el.addEventListener('change', () => this.redrawCaption());
        });
        document.querySelectorAll('#save').forEach((el) => {
            el.addEventListener('click', () => this.saveOptions());
        });
        document.addEventListener('DOMContentLoaded', () => this.restoreOptions());
    }
}

new ExtensionOptions();
