import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./App.css";

export default function ArtistPage() {
  const { name }       = useParams();
  const decodedName    = decodeURIComponent(name);
  const [songs, setSongs]   = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [bio, setBio]       = useState("");

  useEffect(() => {
    setSongs(null);
    setImgUrl(null);
    setBio("");

    fetch(
      `${process.env.REACT_APP_API_URL}/artist/${encodeURIComponent(decodedName)}/songs`
    )
      .then(r => r.ok ? r.json() : [])
      .then(setSongs)
      .catch(() => setSongs([]));

    // Wikipedia summary for photo + short bio
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(decodedName)}`,
      { headers: { Accept: "application/json" } }
    )
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const url = data.originalimage?.source || data.thumbnail?.source || "";
        setImgUrl(url);
        if (data.extract) setBio(data.extract.split(". ").slice(0, 2).join(". ") + ".");
      })
      .catch(() => {});
  }, [decodedName]);

  const initials = decodedName
    .split(/\s+/)
    .map(w => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page">
      <Helmet>
        <title>{decodedName} — ChordQuest</title>
        <meta name="description" content={`Guitar chords for all ${decodedName} songs on ChordQuest.`} />
      </Helmet>

      <div className="glass-card">
        <Link to="/artists" className="back-btn">← Artists</Link>

        <div className="artist-page-hero">
          <div className="artist-page-avatar">
            {imgUrl ? (
              <img src={imgUrl} alt={decodedName} className="artist-page-img" />
            ) : (
              <span className="artist-page-initials">{initials}</span>
            )}
          </div>
          <div className="artist-page-meta">
            <h1 className="song-title">{decodedName}</h1>
            <p className="song-artist">
              {songs === null ? "…" : `${songs.length} song${songs.length !== 1 ? "s" : ""}`}
            </p>
            {bio && <p className="artist-bio">{bio}</p>}
          </div>
        </div>

        <hr className="divider" />

        {songs === null ? (
          <div className="loader" style={{ marginTop: "40px" }}>Loading…</div>
        ) : songs.length === 0 ? (
          <p className="profile-hint">No songs found for this artist.</p>
        ) : (
          <div className="favorites-list">
            {songs.map(song => (
              <Link key={song.song_id} to={`/song/${song.song_id}`} className="favorite-item favorite-link">
                <div className="favorite-link-inner">
                  <span className="favorite-title">{song.song_name}</span>
                  {song.chord_list.length > 0 && (
                    <span className="artist-song-chords">
                      {song.chord_list.slice(0, 5).join("  ·  ")}
                      {song.chord_list.length > 5 ? " …" : ""}
                    </span>
                  )}
                </div>
                {song.genre && song.genre !== "Other" && (
                  <span className="genre-badge">{song.genre}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
