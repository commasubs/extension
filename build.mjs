import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: [
        'internal/background.ts',
        'internal/popup.ts',
        'internal/options.ts',
        'internal/weverse.ts',
        'internal/youtube.ts',
        'internal/berriz.ts'
    ],
    outdir: 'content/scripts',
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: [
        'chrome88', 'edge88', 'firefox109', 'opera74', 'safari15.4'
    ],
    define: {
        'build.CDN_URL': '"https://tracks.commasubs.com"', // no trailing slash!
    },
    plugins: [],
});
