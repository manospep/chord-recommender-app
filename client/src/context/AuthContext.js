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

  async function deleteAccount() {
    const { error } = await supabase.rpc("delete_user");
    if (!error) await supabase.auth.signOut();
    return { error };
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
      syncChords, loadChords, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
