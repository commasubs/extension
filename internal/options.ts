import * as browser from './browser';
import { defCaptions, defOptions, getStyles, Options, querySelector } from './exports';

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
                this.setValue('autoShow', opt.autoShow);
            }
            if (opt.autoCheck) {
                this.setValue('autoCheck', opt.autoCheck);
            }
            this.redrawCaption();
        });
    }

    private redrawCaption(): void {
        querySelector<HTMLElement>('#cue', el => {
            el.setAttribute('style', getStyles(this.getOptions().captions, 640, 480));
        });
    }

    private getOptions(): Options {
        let opt: Options = {
            language: defOptions.language,
            autoShow: defOptions.autoShow,
            autoCheck: defOptions.autoCheck,
            captions: {
                fontFamily: defCaptions.fontFamily,
                fontSize: defCaptions.fontSize,
                textColor: defCaptions.textColor,
                textOpacity: defCaptions.textOpacity,
                bgColor: defCaptions.bgColor,
                bgOpacity: defCaptions.bgOpacity,
            },
        };

        document.querySelectorAll<HTMLSelectElement>('select').forEach((el) => {
            switch (el.id) {
                case 'language':
                    opt.language = el.value;
                    break;
                case 'autoShow':
                    opt.autoShow = el.value;
                    break;
                case 'autoCheck':
                    opt.autoCheck = el.value;
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
