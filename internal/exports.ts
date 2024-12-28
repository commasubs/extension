export type Track = {
    id: string,
    langcode: string,
    langname: string,
    generator: string,
    team: string,
    updated: number,
}

export type Manifest = {
    id: string,
    subtitles: Track[];
}

export const Action = {
    GetManifest: 'GET_MANIFEST',
    GetStyles: 'GET_STYLES',
    SetStyles: 'SET_STYLES',
    SetBadge: 'SET_BADGE',
    SetTrack: 'SET_TRACK',
    DelTrack: 'DEL_TRACK',
} as const;

export type Message = {
    action: string,
}

export type TextMessage = Message & {
    text: string,
}

export type TrackMessage = Message & {
    track: Track,
}

export type Options = {
    language: string;  // preferred language
    autoShow: string;  // automatically show subtitles when found in preferred language
    autoCheck: string; // automatically check for subtitles on every video
    captions: Caption; // options to change cue styles
};

export type Caption = {
    fontFamily: string;
    fontSize: string;
    textColor: string;
    textOpacity: string;
    bgColor: string;
    bgOpacity: string;
};

export const defCaptions: Caption = {
    fontFamily: 'prop-sans-serif',
    fontSize: '100',
    textColor: 'white',
    textOpacity: 'ff',
    bgColor: 'black',
    bgOpacity: 'bf',
};

export const defOptions: Options = {
    language: 'en',
    autoShow: 'off',
    autoCheck: 'off',
    captions: defCaptions,
};

export const fontFamilyMap = new Map([
    ['mono-serif', '"Courier New", Courier, "Nimbus Mono L", "Cutive Mono", monospace'],
    ['prop-serif', '"Times New Roman", Times, Georgia, Cambria, "PT Serif Caption", serif'],
    ['mono-sans-serif', '"Deja Vu Sans Mono", "Lucida Console", Monaco, Consolas, "PT Mono", monospace'],
    ['prop-sans-serif', 'Roboto, Arial, Helvetica, Verdana, "PT Sans Caption", sans-serif'],
    ['casual', '"Comic Sans MS", Impact, Handlee, fantasy'],
    ['cursive', '"Monotype Corsiva", "URW Chancery L", "Apple Chancery", "Dancing Script", cursive'],
    ['capitals', 'Arial, Helvetica, Verdana, "Marcellus SC", sans-serif'],
]);

export const fontSizeMap = new Map<string, number>([
    ['50', 0.5],
    ['75', 0.75],
    ['100', 1],
    ['150', 1.25],
    ['200', 1.5],
    ['300', 1.75],
    ['400', 2],
]);

export const colorsMap = new Map([
    ['white', '#ffffff'],
    ['yellow', '#ffff00'],
    ['green', '#00ff00'],
    ['cyan', '#00ffff'],
    ['blue', '#0000ff'],
    ['magenta', '#ff00ff'],
    ['red', '#ff0000'],
    ['black', '#080808'],
]);

export function getStyles(cap: Caption, w: number, h: number): string {
    let styles: string[] = [
        'font-family:' + fontFamilyMap.get(cap.fontFamily),
        'color: ' + colorsMap.get(cap.textColor) + cap.textOpacity,
        'background: ' + colorsMap.get(cap.bgColor) + cap.bgOpacity,
    ];

    if (cap.fontFamily == 'capitals') {
        styles.push('font-variant: small-caps');
    }

    const mpl = fontSizeMap.get(cap.fontSize) || 1;
    let s = h / 360 * 16;
    if (h >= w) {
        let nw = 640;
        if (h > w * 1.3) {
            nw = 480;
        }
        s = w / nw * 16;
    }

    styles.push('font-size: ' + (s * mpl) + 'px');

    return styles.join('; ');
}

export function querySelector<T extends Element>(selector: string, fn: (el: T) => void): void {
    const el = document.querySelector<T>(selector);
    if (el) {
        fn(el);
    }
}
