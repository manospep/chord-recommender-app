import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  }

  async function signUp(email, password) {
    return supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/verified` },
    });
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signInMagicLink(email) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/verified` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
  }

  async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword });
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  }

  // Favorites
  async function addFavorite(song) {
    return supabase.from("favorites").upsert({
      user_id:     user.id,
      song_id:     song.song_id,
      song_name:   song.song_name,
      artist_name: song.artist_name,
      genre:       song.genre || null,
      chord_list:  (song.chord_list || []).join("|"),
    });
  }

  async function removeFavorite(songId) {
    return supabase.from("favorites").delete()
      .eq("user_id", user.id)
      .eq("song_id", songId);
  }

  async function getFavorites() {
    const { data } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    return data || [];
  }

  async function isFavorited(songId) {
    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .single();
    return !!data;
  }

  // Ratings
  async function ratesSong(songId, rating) {
    if (!user) return { error: new Error("Not logged in") };
    return supabase
      .from("song_ratings")
      .upsert(
        { user_id: user.id, song_id: songId, rating },
        { onConflict: "user_id,song_id" }
      );
  }

  async function getUserRating(songId) {
    if (!user) return null;
    const { data } = await supabase
      .from("song_ratings")
      .select("rating")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .single();
    return data?.rating ?? null;
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc("delete_user");
    if (!error) await supabase.auth.signOut();
    return { error };
  }

  // Song lists (to_learn / learned)
  async function addToList(song, listType) {
    return supabase.from("user_song_lists").upsert({
      user_id:     user.id,
      song_id:     song.song_id,
      list_type:   listType,
      song_name:   song.song_name,
      artist_name: song.artist_name,
      genre:       song.genre || null,
      chord_list:  (song.chord_list || []).join("|"),
    });
  }

  async function removeFromList(songId, listType) {
    return supabase.from("user_song_lists").delete()
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .eq("list_type", listType);
  }

  async function getList(listType) {
    const { data } = await supabase
      .from("user_song_lists")
      .select("*")
      .eq("user_id", user.id)
      .eq("list_type", listType)
      .order("created_at", { ascending: false });
    return data || [];
  }

  async function isInList(songId, listType) {
    const { data } = await supabase
      .from("user_song_lists")
      .select("id")
      .eq("user_id", user.id)
      .eq("song_id", songId)
      .eq("list_type", listType)
      .maybeSingle();
    return !!data;
  }

  // Chord sync
  async function syncChords(chords) {
    return supabase.from("user_chords").upsert({
      user_id:    user.id,
      chords,
      updated_at: new Date().toISOString(),
    });
  }

  async function loadChords() {
    const { data } = await supabase
      .from("user_chords")
      .select("chords")
      .eq("user_id", user.id)
      .single();
    return data?.chords || [];
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signInMagicLink, signOut,
      resetPassword, updatePassword, updateProfile,
      addFavorite, removeFavorite, getFavorites, isFavorited,
      ratesSong, getUserRating,
      addToList, removeFromList, getList, isInList,
      syncChords, loadChords, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
