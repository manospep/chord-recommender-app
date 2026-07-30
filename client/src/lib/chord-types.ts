export interface Song {
  id: string;
  name: string;
  artist: string;
  genre?: string;
  chord_list?: string[];
  match_count?: number;
  matched_chords?: string[];
  missing_chord?: string;
  rating?: number;
  youtube_id?: string;
  year?: number;
}

export interface SongListResponse {
  songs: Song[];
  total: number;
  /** true when results came from the live FastAPI backend, false when served from the built-in catalog */
  live: boolean;
}

export interface SearchInput {
  chords?: string[];
  genre?: string;
  q?: string;
  page?: number;
  limit?: number;
}
