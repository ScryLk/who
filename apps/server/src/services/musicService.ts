import {
  extractYouTubeVideoId,
  extractYouTubeStartTime,
  type MusicProvider,
} from '@who/shared';
import {
  searchYouTubeVideos,
  getYouTubeVideo,
  isYouTubeApiKeyConfigured,
  type YouTubeErrorCode,
} from './youtubeService';

export interface TrackSearchResult {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  audioUrl: string;
  genre?: string;
  provider: MusicProvider;
  durationSeconds?: number;
  videoId?: string;
  channelTitle?: string;
  isVideo?: boolean;
  youtubeId?: string;
  startTimeSeconds?: number;
}

export type SearchTracksArray = TrackSearchResult[] & {
  provider: MusicProvider;
  fallbackApplied?: boolean;
  warning?: string;
  errorCode?: YouTubeErrorCode;
};

export function extractYouTubeInfo(url: string): { youtubeId: string | null; startTimeSeconds: number } {
  const youtubeId = extractYouTubeVideoId(url);
  const startTimeSeconds = extractYouTubeStartTime(url);
  return { youtubeId, startTimeSeconds };
}

export const FEATURED_CATALOG: TrackSearchResult[] = [
  {
    id: 'track-1',
    title: 'Evidências',
    artist: 'Chitãozinho & Xororó',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/32/b7/73/32b7732d-24ff-4053-f953-edbd18767ac3/00731454663724.rgb.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/95/fb/11/95fb1131-a891-1683-a9dd-f5d82843c8b0/mzaf_506792919573114668.plus.aac.p.m4a',
    genre: 'Sertanejo',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-2',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/dc/bc/8a/dcbc8a3e-4ce1-c00d-cc02-eda2212053c7/mzaf_8347559338388601510.plus.aac.p.m4a',
    genre: 'Pop',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-3',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/61/e7/3f/61e73f94-018d-5f50-50ec-8521952bc72e/20UM1IM11629.rgb.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/12/73/ca/1273ca46-233a-5331-189b-25ac1d656533/mzaf_976341070785891411.plus.aac.p.m4a',
    genre: 'Pop',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-4',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4d/08/2a/4d082a9e-7898-1aa1-a02f-339810058d9e/14DMGIM05632.rgb.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/8f/11/52/8f1152a9-fd5f-0021-f546-b97579c22ec3/mzaf_3962258993076347789.plus.aac.p.m4a',
    genre: 'Rock',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-5',
    title: 'Baile de Favela',
    artist: 'MC João',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/b5/6f/74/b56f749c-351b-2b45-b7cb-4fda24c3634a/00718207672639_Cover.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/28/db/c1/28dbc1b5-9565-c4fc-6b44-8e2d5412e8af/mzaf_10429008362657002076.plus.aac.p.m4a',
    genre: 'Funk',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-6',
    title: 'As It Was',
    artist: 'Harry Styles',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/67/10/16/67101606-3869-ca44-6c03-e13d6322cb51/mzaf_1135399237022217274.plus.aac.p.m4a',
    genre: 'Pop',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-7',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/15/e6/e8/15e6e8a4-4190-6a8b-86c3-ab4a51b88288/190295851286.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/44/c7/4f/44c74f0d-72dc-6143-d4d0-ba14d661ca0d/mzaf_9566898362556366703.plus.aac.p.m4a',
    genre: 'Pop',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-8',
    title: 'Cheia de Manias',
    artist: 'Raça Negra',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music/71/cf/9c/mzi.kpwgzike.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/af/52/15/af52151a-903e-98b0-0faf-6ca1d0c782f2/mzaf_237681693234451567.plus.aac.p.m4a',
    genre: 'Pagode',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-9',
    title: 'Levitating',
    artist: 'Dua Lipa',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/59/dc/4d/59dc4dda-93ff-8f1c-c536-f005f6ea6af5/mzaf_3066686759813252385.plus.aac.p.m4a',
    genre: 'Pop',
    provider: 'preview',
    durationSeconds: 30,
  },
  {
    id: 'track-10',
    title: 'Deixa Acontecer',
    artist: 'Grupo Revelação',
    albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music3/v4/8e/d9/33/8ed9338c-ff9d-b2cc-c5a6-39cb863b2a65/7898324303883.jpg/100x100bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9f/72/3f/9f723f22-abfa-9178-7e31-ff2f6d638836/mzaf_15318666961556685886.plus.aac.p.m4a',
    genre: 'Pagode',
    provider: 'preview',
    durationSeconds: 30,
  },
];

export async function searchTracks(query: string): Promise<SearchTracksArray> {
  if (!query || query.trim().length === 0) {
    const list = [...FEATURED_CATALOG] as SearchTracksArray;
    list.provider = 'preview';
    list.fallbackApplied = false;
    return list;
  }

  const trimmed = query.trim();

  // 1. Direct YouTube link or 11-char ID
  const directYtId = extractYouTubeVideoId(trimmed);
  if (directYtId) {
    const startTimeSeconds = extractYouTubeStartTime(trimmed);
    const videoDetails = await getYouTubeVideo(directYtId);
    if (videoDetails) {
      const list = [
        {
          ...videoDetails,
          startTimeSeconds: startTimeSeconds || videoDetails.startTimeSeconds || 0,
        },
      ] as SearchTracksArray;
      list.provider = 'youtube';
      list.fallbackApplied = false;
      return list;
    }

    // Direct YouTube URL fallback if details API not reachable: duration is undefined until player onReady
    const fallbackDirect: TrackSearchResult = {
      id: `yt-${directYtId}`,
      title: `Vídeo do YouTube (${directYtId})`,
      artist: 'YouTube Video',
      albumArt: `https://img.youtube.com/vi/${directYtId}/hqdefault.jpg`,
      audioUrl: `https://www.youtube.com/watch?v=${directYtId}`,
      genre: 'Vídeo',
      provider: 'youtube',
      durationSeconds: undefined,
      videoId: directYtId,
      channelTitle: 'YouTube Video',
      isVideo: true,
      youtubeId: directYtId,
      startTimeSeconds,
    };
    const list = [fallbackDirect] as SearchTracksArray;
    list.provider = 'youtube';
    list.fallbackApplied = false;
    return list;
  }

  // 2. YouTube Data API search
  let ytErrorCode: YouTubeErrorCode | undefined;
  let ytErrorMessage: string | undefined;

  if (isYouTubeApiKeyConfigured()) {
    try {
      const ytResult = await searchYouTubeVideos(trimmed);
      if (ytResult.success && ytResult.tracks.length > 0) {
        const list = ytResult.tracks as SearchTracksArray;
        list.provider = 'youtube';
        list.fallbackApplied = false;
        return list;
      }
      ytErrorCode = ytResult.errorCode;
      ytErrorMessage = ytResult.errorMessage;
    } catch (ytErr: any) {
      console.warn('[MusicService] YouTube search error:', ytErr);
      ytErrorCode = 'YOUTUBE_NETWORK_ERROR';
      ytErrorMessage = ytErr?.message;
    }
  } else {
    ytErrorCode = 'YOUTUBE_KEY_MISSING';
    ytErrorMessage = 'YOUTUBE_API_KEY não configurada no servidor';
  }

  // 3. Fallback to iTunes preview + catalog when YouTube fails or is not configured
  // Clearly identify this as fallbackApplied and provider = preview
  try {
    const encoded = encodeURIComponent(trimmed);
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=10`
    );
    if (!response.ok) {
      const catalog = filterCatalog(trimmed);
      catalog.provider = 'preview';
      catalog.fallbackApplied = true;
      catalog.warning = 'Busca do YouTube indisponível. Exibindo catálogo de prévias (30s) como contingência.';
      catalog.errorCode = ytErrorCode;
      return catalog;
    }
    const data = (await response.json()) as { results: any[] };
    if (!data.results || data.results.length === 0) {
      const catalog = filterCatalog(trimmed);
      catalog.provider = 'preview';
      catalog.fallbackApplied = true;
      catalog.warning = 'Nenhum resultado no YouTube ou iTunes. Exibindo sugestões do catálogo.';
      catalog.errorCode = ytErrorCode;
      return catalog;
    }

    const validTracks: TrackSearchResult[] = data.results
      .filter((item: any) => Boolean(item.previewUrl))
      .map((item: any) => ({
        id: `itunes-${item.trackId}`,
        title: item.trackName || 'Música',
        artist: item.artistName || 'Artista',
        albumArt: item.artworkUrl100 || item.artworkUrl60 || '',
        audioUrl: item.previewUrl,
        genre: item.primaryGenreName || 'Pop',
        provider: 'preview' as const,
        durationSeconds: 30,
      }));

    if (validTracks.length === 0) {
      const catalog = filterCatalog(trimmed);
      catalog.provider = 'preview';
      catalog.fallbackApplied = true;
      catalog.warning = 'Busca do YouTube indisponível. Exibindo catálogo de prévias (30s).';
      catalog.errorCode = ytErrorCode;
      return catalog;
    }

    const list = validTracks as SearchTracksArray;
    list.provider = 'preview';
    list.fallbackApplied = true;
    list.warning = ytErrorMessage
      ? `Aviso: ${ytErrorMessage}. Exibindo prévias de áudio (30s) do acervo alternativo.`
      : 'Busca do YouTube não disponível. Exibindo prévias de áudio (30s) como contingência.';
    list.errorCode = ytErrorCode;
    return list;
  } catch (error) {
    console.error('[MusicService] Error fetching iTunes API, falling back to catalog:', error);
    const catalog = filterCatalog(trimmed);
    catalog.provider = 'preview';
    catalog.fallbackApplied = true;
    catalog.warning = 'Falha nos serviços de busca. Exibindo acervo local.';
    catalog.errorCode = ytErrorCode;
    return catalog;
  }
}

function filterCatalog(query: string): SearchTracksArray {
  const q = query.toLowerCase().trim();
  const matched = FEATURED_CATALOG.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.genre && t.genre.toLowerCase().includes(q))
  );
  const list = (matched.length > 0 ? [...matched] : [...FEATURED_CATALOG]) as SearchTracksArray;
  list.provider = 'preview';
  return list;
}
