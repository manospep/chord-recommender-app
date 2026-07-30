import React, { createContext, useContext, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface User {
  id: string;
  email?: string;
}

interface Profile {
  id: string;
  display_name?: string;
}

interface Favorite {
  song_id: string;
  song_name: string;
  artist_name: string;
  genre?: string;
  chord_list?: string;
}

interface ListItem {
  song_id: string;
  song_name: string;
  artist_name: string;
  genre?: string;
  chord_list?: string;
  list_type: string;
}

interface Feedback {
  song_id: string;
  feedback: "up" | "down";
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signInMagicLink: (email: string) => Promise<{ error?: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: Error | null }>;
  updatePassword: (password: string) => Promise<{ error?: Error | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data?: Profile; error?: Error | null }>;
  addFavorite: (song: { song_id: string; song_name: string; artist_name: string; genre?: string; chord_list?: string[] }) => Promise<{ error?: Error | null }>;
  removeFavorite: (songId: string) => Promise<{ error?: Error | null }>;
  getFavorites: () => Promise<Favorite[]>;
  isFavorited: (songId: string) => Promise<boolean>;
  ratesSong: (songId: string, rating: number) => Promise<{ error?: Error | null }>;
  getUserRating: (songId: string) => Promise<number | null>;
  addToList: (song: { song_id: string; song_name: string; artist_name: string; genre?: string; chord_list?: string[] }, listType: string) => Promise<{ error?: Error | null }>;
  removeFromList: (songId: string, listType: string) => Promise<{ error?: Error | null }>;
  getList: (listType: string) => Promise<ListItem[]>;
  isInList: (songId: string, listType: string) => Promise<boolean>;
  addSuggestionFeedback: (songId: string, feedback: "up" | "down") => Promise<{ error?: Error | null }>;
  getSuggestionFeedback: () => Promise<Feedback[]>;
  syncChords: (chords: string[]) => Promise<{ error?: Error | null }>;
  loadChords: () => Promise<string[]>;
  deleteAccount: () => Promise<{ error?: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await getSupabase()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
  }

  async function signUp(email: string, password: string) {
    return getSupabase().auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/verified` },
    });
  }

  async function signIn(email: string, password: string) {
    return getSupabase().auth.signInWithPassword({ email, password });
  }

  async function signInMagicLink(email: string) {
    return getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/verified` },
    });
  }

  async function signOut() {
    await getSupabase().auth.signOut();
  }

  async function resetPassword(email: string) {
    return getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
  }

  async function updatePassword(newPassword: string) {
    return getSupabase().auth.updateUser({ password: newPassword });
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: new Error("Not logged in") };
    const { data, error } = await getSupabase()
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();
    if (!error) setProfile(data as Profile);
    return { data: data as Profile | undefined, error: error ?? undefined };
  }

  async function addFavorite(song: { song_id: string; song_name: string; artist_name: string; genre?: string; chord_list?: string[] }) {
    if (!user) return { error: new Error("Not logged in") };
    return getSupabase().from("favorites").upsert({
      user_id: user.id,
      song_id: song.song_id,
      song_name: song.song_name,
      artist_name: song.artist_name,
      genre: song.genre || null,
      chord_list: (song.chord_list || []).join("|"),
    });
  }

  async function removeFavorite(songId: string) {
    if (!user) return { error: new Error("Not logged in") };
    return getSupabase().from("favorites").delete()
      .eq("user_id", user.id)
      .eq("song_id", songId);
  }

  async function getFavorites() {
    if (!user) return [];
    const { data } = await getSupabase()
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    return (data || []) as Favorite[];
  }

  async function isFavorited(songId: string) {
    if (!user) return false;
    const { data } = await getSupabase()
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .single();
    return !!data;
  }

  async function ratesSong(songId: string, rating: number) {
    if (!user) return { error: new Error("Not logged in") };
    return getSupabase()
      .from("song_ratings")
      .upsert(
        { user_id: user.id, song_id: songId, rating },
        { onConflict: "user_id,song_id" }
      );
  }

  async function getUserRating(songId: string) {
    if (!user) return null;
    const { data } = await getSupabase()
      .from("song_ratings")
      .select("rating")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .single();
    return data?.rating ?? null;
  }

  async function addToList(song: { song_id: string; song_name: string; artist_name: string; genre?: string; chord_list?: string[] }, listType: string) {
    if (!user) return { error: new Error("Not logged in") };
    return getSupabase().from("user_song_lists").upsert({
      user_id: user.id,
      song_id: song.song_id,
      list_type: listType,
      song_name: song.song_name,
      artist_name: song.artist_name,
      genre: song.genre || null,
      chord_list: (song.chord_list || []).join("|"),
    }, { onConflict: "user_id,song_id,list_type" });
  }

  async function removeFromList(songId: string, listType: string) {
    if (!user) return { error: new Error("Not logged in") };
    return getSupabase().from("user_song_lists").delete()
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .eq("list_type", listType);
  }

  async function getList(listType: string) {
    if (!user) return [];
    const { data } = await getSupabase()
      .from("user_song_lists")
      .select("*")
      .eq("user_id", user.id)
      .eq("list_type", listType);
    return (data || []) as ListItem[];
  }

  async function isInList(songId: string, listType: string) {
    if (!user) return false;
    const { data } = await getSupabase()
      .from("user_song_lists")
      .select("song_id")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .eq("list_type", listType)
      .maybeSingle();
    return !!data;
  }

  async function addSuggestionFeedback(songId: string, feedback: "up" | "down") {
    if (!user) return { error: new Error("Not logged in") };
    return getSupabase().from("suggestion_feedback").upsert({
      user_id: user.id,
      song_id: songId,
      feedback,
    }, { onConflict: "user_id,song_id" });
  }

  async function getSuggestionFeedback() {
    if (!user) return [];
    const { data } = await getSupabase()
      .from("suggestion_feedback")
      .select("song_id,feedback")
      .eq("user_id", user.id);
    return (data || []) as Feedback[];
  }

  async function syncChords(chords: string[]) {
    if (!user) return { error: new Error("Not logged in") };
    return getSupabase().from("user_chords").upsert({
      user_id: user.id,
      chords,
      updated_at: new Date().toISOString(),
    });
  }

  async function loadChords() {
    if (!user) return [];
    const { data } = await getSupabase()
      .from("user_chords")
      .select("chords")
      .eq("user_id", user.id)
      .single();
    return (data?.chords as string[] | undefined) || [];
  }

  async function deleteAccount() {
    const { error } = await getSupabase().rpc("delete_user");
    if (!error) await getSupabase().auth.signOut();
    return { error: error ?? undefined };
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signInMagicLink, signOut,
      resetPassword, updatePassword, updateProfile,
      addFavorite, removeFavorite, getFavorites, isFavorited,
      ratesSong, getUserRating,
      addToList, removeFromList, getList, isInList,
      addSuggestionFeedback, getSuggestionFeedback,
      syncChords, loadChords, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
