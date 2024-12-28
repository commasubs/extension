import Browser from 'webextension-polyfill';

let b: Browser.Browser;

// @ts-ignore
if (!(globalThis.browser && globalThis.browser.runtime && globalThis.browser.runtime.id)) {
    // @ts-ignore
    b = globalThis.chrome;
} else {
    // @ts-ignore
    b = globalThis.browser;
}

export = b;
