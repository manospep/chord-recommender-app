import { createServerFn } from "@tanstack/react-start";
import type { SearchInput } from "./chord-types";
import {
  searchSongsImpl,
  oneChordAwayImpl,
  topSongsImpl,
  recentSongsImpl,
  getSongImpl,
  browseImpl,
  getArtistsImpl,
  getArtistSongsImpl,
} from "./chordapi.server";

const validateSearch = (input: SearchInput): SearchInput => ({
  chords: Array.isArray(input?.chords) ? input.chords.slice(0, 16).map(String) : [],
  genre: typeof input?.genre === "string" ? input.genre : undefined,
  q: typeof input?.q === "string" ? input.q.slice(0, 100) : undefined,
  page: Math.max(1, Math.min(Number(input?.page) || 1, 50)),
  limit: Math.max(1, Math.min(Number(input?.limit) || 20, 50)),
});

export const searchSongs = createServerFn({ method: "POST" })
  .inputValidator(validateSearch)
  .handler(async ({ data }) => searchSongsImpl(data));

export const oneChordAway = createServerFn({ method: "POST" })
  .inputValidator(validateSearch)
  .handler(async ({ data }) => oneChordAwayImpl(data));

export const browseSongs = createServerFn({ method: "POST" })
  .inputValidator(validateSearch)
  .handler(async ({ data }) => browseImpl(data));

export const topSongs = createServerFn({ method: "POST" })
  .inputValidator((input: { limit?: number }) => ({ limit: Math.max(1, Math.min(Number(input?.limit) || 8, 24)) }))
  .handler(async ({ data }) => topSongsImpl(data.limit));

export const recentSongs = createServerFn({ method: "POST" })
  .inputValidator((input: { limit?: number }) => ({ limit: Math.max(1, Math.min(Number(input?.limit) || 8, 24)) }))
  .handler(async ({ data }) => recentSongsImpl(data.limit));

export const getSong = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "").slice(0, 64) }))
  .handler(async ({ data }) => getSongImpl(data.id));

export const getArtists = createServerFn({ method: "POST" })
  .inputValidator((input: { q?: string }) => ({ q: typeof input?.q === "string" ? input.q.slice(0, 100) : undefined }))
  .handler(async ({ data }) => getArtistsImpl(data.q));

export const getArtistSongs = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string }) => ({ name: String(input?.name ?? "").slice(0, 200) }))
  .handler(async ({ data }) => getArtistSongsImpl(data.name));
