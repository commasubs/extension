# Comma Subs browser extension

## Intro

An extension to display subtitles made by a community on videos where the publisher did not provide subtitles
with the video.

## How it works

Anyone can upload subtitle file in WebVTT format to a free service at www.commasubs.com.
This extension query the service if there are any subtitles for the currently playing video
and offers to display them. The subtitles are displayed using the HTML Track element.

## Environment

```text
node 20.18.1
npm  10.8.2
```

## Installation

Start by installing dependencies.

```shell
npm install
```

The development is done using typescript but extension is using bundled javascript files.
Everytime there is a change in a typescript file a new build must be done. The generated
javascript files are in `content/scripts` folder.

```shell
npm run build
```

We are using Tailwind CSS framework so css files needs to be built.

```shell
npx tailwindcss -i ./internal/options.css -o ./content/options.css
npx tailwindcss -i ./internal/popup.css -o ./content/popup.css
```

We need to support multiple browsers and each can have slightly different manifest file.
Run this command to create a manifest file for a browser. Replace `<name>` with an actual
browser name. Look in the `tools` folder for a list of possible options. The command would
also create a zip file, but you can delete that.

```shell
bash tools/build-<name>.sh
```

## Development

- everytime you make changes to a typescript file don't forget to run `npm run build`
- you can have tailwindcss watch for changes when you're editing files,
  just add `--watch` at the end of the commands above
- `html` files are in the `content` folder and must be edited there

## Publishing

When a new release is created on GitHub an action will run that will create zip archives for
every browser and attach them to the release. You can upload those archives to the extension stores.

_Files in the `internal` folder are only for the development and
must not be distributed with the extension._

### Name
*(change in manifest file under `name`)*

> Comma Subs

### Summary
*(change in manifest file under `description`)*

> Watch videos with community made subtitles.

### Description
*(change in extension stores)*

> You would like to watch a video, but you don't understand the spoken language and no subtitles were provided.
> There are volunteers that make subtitles for videos and upload them to the Comma Subs website.
>
> Every time you start watching a video on one of our supported websites this extension will check
> if anyone uploaded subtitles for that video so you can watch them.
>
> Currently supported sites are YouTube and Weverse.
>
> NOTE: Automatic checking for subtitles is disabled by default. You have to click on the extension
> every time you want to know if there are subtitles available for a video. You can enable automatic
> checking for subtitles in the extension options.

### Support

- Email: support@commasubs.com
- URL: https://www.commasubs.com/support


## Supported browsers

| Name    | Engine | Min. Ver. |      Release | Reason |
|:--------|:-------|----------:|-------------:|:-------|
| Chrome  | Blink  |        88 | Jan 19, 2021 | MV3    |
| Edge    | Blink  |        88 | Jan 21, 2021 | MV3    |
| Firefox | Gecko  |       109 | Jan 17, 2023 | MV3    |
| Opera   | Blink  |        74 |  Feb 2, 2021 | MV3    |
| Safari  | WebKit |      15.4 | Mar 14, 2022 | MV3    |

