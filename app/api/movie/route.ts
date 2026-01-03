const JELLYFIN_URL = process.env.JELLYFIN_URL!;
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY!;
const JELLYFIN_USERNAME = process.env.JELLYFIN_USERNAME!;

interface JellyfinSession {
  NowPlayingItem?: {
    Name: string;
    ProductionYear?: number;
    Type: string;
    Id: string;
    People?: Array<{ Name: string; Type: string }>;
  };
}

let cachedUserId: string | null = null;

async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const res = await fetch(`${JELLYFIN_URL}/Users?api_key=${JELLYFIN_API_KEY}`);
  const users = await res.json();
  const user = users.find(
    (u: { Name: string; Id: string }) =>
      u.Name.toLowerCase() === JELLYFIN_USERNAME.toLowerCase()
  );
  cachedUserId = user.Id;
  return user.Id;
}

async function getSessions(userId: string): Promise<JellyfinSession[]> {
  const res = await fetch(
    `${JELLYFIN_URL}/Sessions?api_key=${JELLYFIN_API_KEY}`
  );
  const sessions = await res.json();
  return sessions.filter((s: { UserId: string }) => s.UserId === userId);
}

async function getRecentItems(userId: string, type: string) {
  const res = await fetch(
    `${JELLYFIN_URL}/Users/${userId}/Items?IncludeItemTypes=${type}&Limit=1&SortBy=DatePlayed&SortOrder=Descending&Recursive=true&Fields=People&api_key=${JELLYFIN_API_KEY}`
  );
  return res.json();
}

async function getImageBase64(itemId: string): Promise<string> {
  const res = await fetch(
    `${JELLYFIN_URL}/Items/${itemId}/Images/Primary?api_key=${JELLYFIN_API_KEY}`
  );
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

function generateSVG(
  movieTitle: string,
  releaseYear: string,
  director: string,
  imageB64: string
): string {
  return `
    <svg width="480" height="133" xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="480" height="133">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            .main { display: flex; }
            .container { border-radius: 5px; padding: 10px 10px 10px 0px; }
            .art { width: 27%; float: left; margin-left: -5px; }
            .content { width: 71%; }
            .movieTitle { color: #666; overflow: hidden; margin-top: 3px; font-size: 24px; text-align: center; white-space: nowrap; text-overflow: ellipsis; }
            .releaseYear { color: #b3b3b3; font-size: 20px; margin-top: 4px; text-align: center; margin-bottom: 5px; }
            .cover { width: 100px; height: 150px; border-radius: 5px; object-fit: cover; }
            div { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji; }
          </style>
          <div class="main">
            <a class="art" href="#" target="_blank">
              <center>
                <img src="data:image/jpeg;base64,${imageB64}" class="cover" />
              </center>
            </a>
            <div class="content">
              <div class="movieTitle">${movieTitle}</div>
              <div class="releaseYear">${releaseYear}</div>
              <div class="releaseYear">${director}</div>
            </div>
          </div>
        </div>
      </foreignObject>
    </svg>
  `.trim();
}

export async function GET() {
  try {
    const userId = await getUserId();
    const [sessions, recent] = await Promise.all([
      getSessions(userId),
      getRecentItems(userId, 'Movie'),
    ]);

    let item = sessions.find(
      (s) => s.NowPlayingItem?.Type === 'Movie'
    )?.NowPlayingItem;

    if (!item) {
      item = recent.Items?.[0];
    }

    if (!item) {
      return new Response('No movie found', { status: 404 });
    }

    const imageB64 = await getImageBase64(item.Id);
    const movieTitle = item.Name;
    const releaseYear = item.ProductionYear ? `${item.ProductionYear}` : '';
    const director = item.People?.find(
      (p: { Name: string; Type: string }) => p.Type === 'Director'
    )?.Name;
    const directorText = director ? `Directed by ${director}` : '';

    const svg = generateSVG(movieTitle, releaseYear, directorText, imageB64);

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}
