export interface TrackSearchResult {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  audioUrl: string;
  genre?: string;
  isVideo?: boolean;
  youtubeId?: string;
  startTimeSeconds?: number;
}

export function extractYouTubeInfo(url: string): { youtubeId: string | null; startTimeSeconds: number } {
  if (!url) return { youtubeId: null, startTimeSeconds: 0 };

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const youtubeId = match && match[2].length === 11 ? match[2] : null;

  let startTimeSeconds = 0;
  const timeMatch = url.match(/[?&]t=([0-9]+s?|[0-9]+m[0-9]+s?)/);
  if (timeMatch) {
    const rawTime = timeMatch[1];
    if (rawTime.includes('m')) {
      const parts = rawTime.split('m');
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1].replace('s', ''), 10) || 0;
      startTimeSeconds = mins * 60 + secs;
    } else {
      startTimeSeconds = parseInt(rawTime.replace('s', ''), 10) || 0;
    }
  }

  return { youtubeId, startTimeSeconds };
}

const FEATURED_CATALOG: TrackSearchResult[] = [
  {
    id: 'track-1',
    title: 'Evidências',
    artist: 'Chitãozinho & Xororó',
    albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    genre: 'Sertanejo',
  },
  {
    id: 'track-2',
    title: 'Baile de Favela',
    artist: 'MC João',
    albumArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
    genre: 'Funk',
  },
  {
    id: 'track-3',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    albumArt: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73562.mp3',
    genre: 'Pop',
  },
  {
    id: 'track-4',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    albumArt: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f6055d.mp3',
    genre: 'Rock',
  },
  {
    id: 'track-5',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    albumArt: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c2794c965c.mp3',
    genre: 'Internacional',
  },
];

export async function searchTracks(query: string): Promise<TrackSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return FEATURED_CATALOG;
  }

  // Check if query is YouTube URL
  const ytInfo = extractYouTubeInfo(query);
  if (ytInfo.youtubeId) {
    return [
      {
        id: `yt-${ytInfo.youtubeId}`,
        title: `Vídeo do YouTube (${ytInfo.youtubeId})`,
        artist: 'YouTube Video',
        albumArt: `https://img.youtube.com/vi/${ytInfo.youtubeId}/hqdefault.jpg`,
        audioUrl: `https://www.youtube.com/embed/${ytInfo.youtubeId}`,
        genre: 'Vídeo',
        isVideo: true,
        youtubeId: ytInfo.youtubeId,
        startTimeSeconds: ytInfo.startTimeSeconds,
      },
    ];
  }

  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=10`
    );
    if (!response.ok) {
      return filterCatalog(query);
    }
    const data = (await response.json()) as { results: any[] };
    if (!data.results || data.results.length === 0) {
      return filterCatalog(query);
    }

    return data.results.map((item: any) => ({
      id: `itunes-${item.trackId}`,
      title: item.trackName || 'Música',
      artist: item.artistName || 'Artista',
      albumArt: item.artworkUrl100 || item.artworkUrl60 || '',
      audioUrl: item.previewUrl || 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      genre: item.primaryGenreName || 'Pop',
    }));
  } catch (error) {
    console.error('Error fetching iTunes API, falling back to catalog:', error);
    return filterCatalog(query);
  }
}

function filterCatalog(query: string): TrackSearchResult[] {
  const q = query.toLowerCase();
  const matched = FEATURED_CATALOG.filter(
    (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
  );
  return matched.length > 0 ? matched : FEATURED_CATALOG;
}
