# APK Grab

A web tool for downloading Android APK files. Search by app name or paste a Google Play Store URL and get direct download links from multiple trusted sources.

## Features

- **App Search** -- Find any Android app by name, package ID, or Play Store link
- **Multi-Source Downloads** -- Pulls APK files from APKPure (page scrape + CDN), APKCombo, and APKMirror
- **Graceful Fallback** -- When no direct download is available, still shows the app card, Play Store link, and mod site links
- **Mod APK Discovery** -- Searches HappyMod, ModYolo, LiteAPKs, AN1, APKDone, and APKMody for modded versions
- **Streaming Downloads** -- APK files stream through a server proxy for reliable delivery
- **App Details** -- Displays name, icon, package ID, version, and source information
- **Light / Dark Theme** -- Toggle between light and dark mode with persistent preference
- **3D Particle Background** -- Animated Three.js scene behind the interface
- **GSAP Animations** -- Smooth entrance animations and transition effects throughout
- **Font Awesome Icons** -- All UI icons use Font Awesome 6 vector icons

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Backend   | Node.js, Express, Axios, Cheerio              |
| Frontend  | Vanilla HTML / CSS / JS                       |
| Icons     | Font Awesome 6                                |
| Fonts     | Plus Jakarta Sans, Outfit, JetBrains Mono     |
| Animation | GSAP 3.12, Three.js r128                      |
| Design    | ShadUI-inspired tokens, glassmorphism, CSS custom properties |

## Quick Start

```bash
git clone <repository-url>
cd APK_Downloader
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Project Structure

```
APK_Downloader/
  package.json        Project metadata and dependencies
  server.js           Express server, API endpoints, APK scraping logic
  README.md           This file
  public/
    index.html        Main page with Three.js canvas and GSAP targets
    styles.css        Design system with light/dark themes
    script.js         Animations, 3D background, theme toggle, search flow
```

## API Reference

### POST /api/download

Search for an APK by app name or Play Store URL.

**Request:**
```json
{ "url": "WhatsApp" }
```

**Success Response (direct download available):**
```json
{
  "name": "WhatsApp Messenger",
  "packageId": "com.whatsapp",
  "icon": "https://...",
  "downloadUrl": "https://...",
  "source": "APKPure CDN",
  "playStoreUrl": "https://play.google.com/store/apps/details?id=com.whatsapp",
  "modInfo": {
    "appName": "WhatsApp Messenger",
    "sites": [
      { "name": "HappyMod", "icon": "fa-solid fa-face-smile", "url": "https://...", "found": false }
    ]
  }
}
```

**Partial Response (app found, no direct download -- HTTP 404):**
```json
{
  "error": "APK not found. Try a more popular app.",
  "appInfo": {
    "name": "Spotify: Music and Podcasts",
    "packageId": "com.spotify.music",
    "icon": "https://...",
    "playStoreUrl": "https://play.google.com/store/apps/details?id=com.spotify.music"
  },
  "modInfo": { "appName": "Spotify: Music and Podcasts", "sites": [] }
}
```

The frontend renders the app card and mod links from partial responses instead of showing a generic error.

### GET /api/download-apk

Proxy-streams an APK file download.

**Query Parameters:**
- `url` (required) -- Encoded APK source URL
- `name` (optional) -- App name for the filename
- `packageId` (optional) -- Package ID fallback for the filename

### GET /api/health

Returns `{ "ok": true }` for uptime monitoring.

## Download Sources

| Priority | Source       | Method                              |
|----------|-------------|-------------------------------------|
| 1        | APKPure     | Page scrape for download link       |
| 2        | APKPure CDN | Direct HEAD check on CDN endpoints  |
| 3        | APKCombo    | Page scrape with cheerio            |
| 4        | APKMirror   | Page scrape with cheerio            |

## Configuration

| Variable | Description          | Default |
|----------|----------------------|---------|
| PORT     | Server listen port   | 3000    |

## Dependencies

| Package  | Version       | Purpose                     |
|----------|---------------|-----------------------------|
| express  | ^4.18.2       | Web server framework        |
| axios    | ^1.6.2        | HTTP client for scraping    |
| cheerio  | 1.0.0-rc.10   | HTML parsing                |
| cors     | ^2.8.5        | Cross-origin middleware     |

GSAP, Three.js, and Font Awesome are loaded from CDN and require no server-side installation.

## Troubleshooting

**Server will not start:**
Verify Node.js v14+ is installed (`node --version`) and run `npm install`.

**No APK found:**
The app card and mod site links will still appear. Try the Play Store link or browse the mod repositories directly. Some apps may not be available on third-party CDN sources.

**Download fails or times out:**
Check your connection. The source server may be temporarily unreachable.

## Legal

This tool is for educational and personal use only. Users are responsible for compliance with applicable laws and terms of service. No APK files are hosted by this project.
