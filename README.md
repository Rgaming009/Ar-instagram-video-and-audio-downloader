# InstaDown Pro

InstaDown Pro is a responsive React app for working with media you own or are
authorized to use. It can download a locally selected video unchanged or
transcode it to a smaller MP4, and extract an MP3 from an uploaded audio or
video file.

**Instagram URL downloading is intentionally not implemented.** The URL field
is provided for convenience, but the app does not fetch Instagram pages, scrape
content, or bypass Instagram's access controls. Use the official Instagram
download/export tools to obtain media you are allowed to use, then process the
file here.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

FFmpeg is installed from the `ffmpeg-static` npm package; a separate system
FFmpeg installation is not required.

## Setup

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
The Express API runs on port `3001` and is proxied by Vite during development.

## Features

- Responsive video and audio workspaces.
- Local video preview and original-file download.
- Optional MP4 transcoding to 1080p, 720p, or 480p.
- MP3 extraction with a preview player.
- Upload limit of 150 MB per file.
- API uploads are written to a temporary directory and removed after
  processing. FFmpeg is launched with argument arrays (not a shell command),
  and conversion time is bounded.

## Production

```bash
npm run build
npm start
```

The API serves the built frontend from `dist` when available. Set `PORT` to
change the API port (default `3001`). The server accepts media file uploads
only; it does not accept a URL to fetch.

Only upload files you own or have permission to process. Conversion consumes
server resources; deploy behind appropriate authentication and rate limiting
if exposing the API publicly.
