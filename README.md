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

## Vercel

The Vercel deployment serves the Vite frontend (`npm run build`, output
directory `dist`). The Express/FFmpeg API must run separately on a Node.js host
that supports native binaries, temporary disk space, and long-running requests.
Do not deploy the media endpoints as Vercel Functions: their 4.5 MB request
body limit is far below the app's 150 MB upload limit. Vercel Functions also
have a maximum execution duration, so they are not a suitable replacement for
this conversion server.

In Vercel, import the repository with the project root set to `./` and use:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Set `VITE_API_BASE_URL` in the Vercel project's environment variables to the
public origin of the separately hosted API (for example,
`https://api.example.com`, with no trailing slash or `/api`). Set it for each
deployment environment and redeploy after changing it. This value is included
in the frontend bundle, so it must not contain secrets. No API keys are
required by this project.

On the API host, set `CORS_ORIGINS` to a comma-separated list of the exact
frontend origins allowed to call the API (for example,
`https://your-project.vercel.app,https://www.example.com`). Set `PORT` only if
the host does not provide it automatically. The API host must allow requests
up to 150 MB and provide enough execution time, memory, and temporary storage
for FFmpeg. The server also enforces a three-minute conversion timeout.
