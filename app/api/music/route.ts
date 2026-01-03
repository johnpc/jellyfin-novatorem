const JELLYFIN_URL = process.env.JELLYFIN_URL!;
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY!;
const JELLYFIN_USERNAME = process.env.JELLYFIN_USERNAME!;

interface JellyfinSession {
  NowPlayingItem?: {
    Name: string;
    SeriesName?: string;
    Album?: string;
    AlbumArtist?: string;
    Artists?: string[];
    Type: string;
    Id: string;
  };
  PlayState?: {
    PositionTicks: number;
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
    `${JELLYFIN_URL}/Users/${userId}/Items?IncludeItemTypes=${type}&Limit=1&SortBy=DatePlayed&SortOrder=Descending&Recursive=true&api_key=${JELLYFIN_API_KEY}`
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
  title: string,
  subtitle: string,
  imageB64: string
): string {
  const bars = Array(84)
    .fill(0)
    .map((_, i) => {
      const anim = Math.floor(Math.random() * 350) + 1000;
      return `<div class="bar" style="left: ${1 + i * 4}px; animation-duration: ${anim}ms;"></div>`;
    })
    .join('');

  return `
    <svg width="480" height="133" xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="480" height="133">
        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <style>
            .main { display: flex; }
            .container { border-radius: 5px; padding: 10px 10px 10px 0px; }
            .art { width: 27%; float: left; margin-left: -5px; }
            .content { width: 71%; }
            .song { color: #666; overflow: hidden; margin-top: 3px; font-size: 24px; text-align: center; white-space: nowrap; text-overflow: ellipsis; }
            .artist { color: #b3b3b3; font-size: 20px; margin-top: 4px; text-align: center; margin-bottom: 5px; }
            .cover { width: 100px; height: 100px; border-radius: 5px; }
            #bars { width: 40px; height: 30px; bottom: 23px; position: absolute; margin: -20px 0 0 0px; }
            .bar { width: 3px; bottom: 1px; height: 3px; position: absolute; background: #1DB954cc; animation: sound 0ms -800ms linear infinite alternate; }
            div { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji; }
            @keyframes sound { 0% { height: 3px; opacity: .35; } 100% { height: 15px; opacity: 0.95; } }
          </style>
          <div class="main">
            <a class="art" href="#" target="_blank">
              <center>
                <img src="data:image/jpeg;base64,${imageB64}" class="cover" />
              </center>
            </a>
            <div class="content">
              <div class="song">${title}</div>
              <div class="artist">${subtitle}</div>
              <div id="bars">${bars}</div>
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
      getRecentItems(userId, 'Audio'),
    ]);

    let item = sessions.find(
      (s) => s.NowPlayingItem?.Type === 'Audio'
    )?.NowPlayingItem;

    if (!item) {
      item = recent.Items?.[0];
    }

    if (!item) {
      return new Response('No music found', { status: 404 });
    }

    const imageB64 = await getImageBase64(item.Id);
    const title = item.Name;
    const subtitle = item.AlbumArtist || item.Artists?.[0] || item.Album || '';

    const svg = generateSVG(title, subtitle, imageB64);

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}
