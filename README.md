# Jellyfin Novatorem

Generate SVG images showing your currently playing/watched media from Jellyfin.

## Endpoints

- `/api/music` - Currently playing or last listened music
- `/api/tv` - Currently watching or last watched TV show
- `/api/movie` - Currently watching or last watched movie

## Setup

1. Copy `.env.example` to `.env` and fill in your Jellyfin credentials
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`
4. Access endpoints at `http://localhost:3000/api/music`, etc.

## Deploy

Deploy to Vercel:

```bash
vercel
```

Add environment variables in Vercel dashboard.

## Usage

Embed in your GitHub README:

```markdown
![Music](https://your-app.vercel.app/api/music)
![TV](https://your-app.vercel.app/api/tv)
![Movie](https://your-app.vercel.app/api/movie)
```
