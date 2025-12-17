# APK Downloader

A web-based application for downloading Android APK files from the Google Play Store. This tool allows users to search for applications by name or Play Store URL and provides direct APK download links from multiple trusted sources.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

APK Downloader is a Node.js-based web application that aggregates APK download links from various third-party sources. It provides a clean, modern web interface for searching and downloading Android applications without requiring direct access to the Google Play Store.

## Features

### Core Functionality
- **App Search**: Search for Android applications by name or Google Play Store URL
- **Package ID Extraction**: Automatic extraction of package identifiers from Play Store URLs
- **Multi-Source Downloads**: Aggregates download links from multiple APK repositories:
  - APKPure CDN (Primary)
  - APKCombo
  - APKMirror
- **Streaming Downloads**: Direct APK file streaming through the server proxy
- **App Information Display**: Shows application name, icon, and package identifier

### Mod APK Search
- Searches popular mod APK websites for modified versions:
  - HappyMod
  - ModYolo
  - LiteAPKs
  - AN1
  - APKDone
  - APKMody

### Performance Optimizations
- HTTP/HTTPS connection pooling for improved request performance
- Parallel source checking for faster results
- Configurable timeouts for different operation types
- Response streaming for large file downloads

### User Interface
- Responsive dark-themed design
- Real-time search status indicators
- Quick-access example applications
- Direct Play Store link for verification

## Architecture

The application follows a client-server architecture:

```
+------------------+         +------------------+         +------------------+
|                  |  HTTP   |                  |  HTTP   |                  |
|  Web Browser     +-------->+  Express Server  +-------->+  APK Sources     |
|  (Frontend)      |         |  (Backend)       |         |  (Third-party)   |
|                  |<--------+                  |<--------+                  |
+------------------+         +------------------+         +------------------+
```

### Backend Components
- **Express.js Server**: Handles HTTP requests and serves static files
- **APK Finder Module**: Searches multiple sources for APK download links
- **Download Proxy**: Streams APK files through the server to handle redirects and authentication
- **Play Store Scraper**: Extracts app information and search results

### Frontend Components
- **HTML/CSS**: Responsive user interface with modern styling
- **JavaScript**: Client-side logic for API communication and UI updates

## Prerequisites

- Node.js (version 14.0 or higher)
- npm (Node Package Manager)
- Internet connection for accessing APK sources

## Installation

1. Clone or download the repository:
   ```bash
   git clone <repository-url>
   cd Apk_Downloader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Access the application in your web browser:
   ```
   http://localhost:3000
   ```

## Usage

### Search by Application Name
1. Enter the application name in the search field (e.g., "WhatsApp", "Instagram")
2. Click the "Search" button or press Enter
3. Wait for the search results to load
4. Click "Download APK" to initiate the download

### Search by Play Store URL
1. Copy the Google Play Store URL of the desired application
2. Paste the URL into the search field
3. Click "Search" to process the request
4. Download the APK file from the results

### Example Inputs
- Application name: `Spotify`
- Play Store URL: `https://play.google.com/store/apps/details?id=com.spotify.music`
- Package ID: `com.spotify.music`

## API Reference

### POST /api/download

Searches for APK download links based on the provided input.

**Request Body:**
```json
{
  "url": "string (app name or Play Store URL)"
}
```

**Response:**
```json
{
  "name": "Application Name",
  "packageId": "com.example.app",
  "icon": "https://...",
  "downloadUrl": "https://...",
  "source": "APKPure CDN",
  "playStoreUrl": "https://play.google.com/store/apps/details?id=com.example.app",
  "modInfo": {
    "appName": "Application Name",
    "sites": [...]
  }
}
```

**Error Response:**
```json
{
  "error": "Error message description"
}
```

### GET /api/download-apk

Proxies and streams the APK file download.

**Query Parameters:**
- `url` (required): Encoded URL of the APK source
- `name` (optional): Application name for filename
- `packageId` (optional): Package identifier for filename fallback

**Response:**
- Content-Type: `application/vnd.android.package-archive`
- Content-Disposition: `attachment; filename="app_name.apk"`

### GET /api/health

Health check endpoint for monitoring.

**Response:**
```json
{
  "ok": true
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server listening port | `3000` |

### Timeout Settings

The application uses different timeout configurations for various operations:

| Operation | Timeout | Description |
|-----------|---------|-------------|
| Fast checks | 5-8 seconds | Source availability verification |
| Search operations | 10 seconds | Play Store and mod site searches |
| File downloads | 5 minutes | Large APK file transfers |

## Project Structure

```
Apk_Downloader/
├── package.json          # Project metadata and dependencies
├── server.js             # Express server and API endpoints
├── README.md             # Project documentation
└── public/               # Static frontend files
    ├── index.html        # Main HTML page
    ├── script.js         # Client-side JavaScript
    └── styles.css        # CSS styling
```

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web server framework |
| axios | ^1.6.2 | HTTP client for API requests |
| cheerio | 1.0.0-rc.10 | HTML parsing and scraping |
| cors | ^2.8.5 | Cross-Origin Resource Sharing middleware |

## Troubleshooting

### Common Issues

**Application not starting:**
- Verify Node.js is installed: `node --version`
- Ensure all dependencies are installed: `npm install`
- Check if port 3000 is available

**No APK found for application:**
- Try using the exact Play Store URL instead of the app name
- Some applications may not be available on third-party sources
- Verify the application exists on Google Play Store

**Download fails or times out:**
- Check your internet connection
- The source server may be temporarily unavailable
- Try again after a few minutes

**CORS errors in browser:**
- Ensure the server is running
- Access the application through `http://localhost:3000`

### Debug Mode

Server logs are output to the console and include:
- Search operations and results
- Download source selection
- Streaming progress and errors

## Legal Disclaimer

This tool is provided for educational and personal use only. Users are responsible for ensuring compliance with applicable laws and terms of service when downloading applications. The developers do not host any APK files and are not responsible for the content provided by third-party sources.

## License

This project is available for personal use. See the LICENSE file for additional terms and conditions.
