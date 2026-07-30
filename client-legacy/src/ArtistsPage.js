import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./App.css";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

// Module-level cache so re-renders never re-fetch the same artist
const _imgCache = new Map();

// Search Wikipedia for the musician/band page, not an unrelated article
async function fetchArtistWikiImage(name) {
  const qualifiers = ["band", "musician", "singer", "rapper", "artist"];
  for (const q of qualifiers) {
    try {
      const search = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${name} ${q}`)}&format=json&origin=*&srlimit=1`
      );
      const json = await search.json();
      const title = json?.query?.search?.[0]?.title;
      if (!title) continue;
      const sum = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!sum.ok) continue;
      const data = await sum.json();
      if (data.type === "disambiguation") continue;
      const img = data?.thumbnail?.source || "";
      if (img) return img;
    } catch {}
  }
  return "";
}

function ArtistCard({ artist }) {
  const cardRef = useRef(null);
  const cached  = _imgCache.get(artist.name);
  const [imgUrl, setImgUrl] = useState(cached !== undefined ? cached : null);

  useEffect(() => {
    if (imgUrl !== null) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      fetchArtistWikiImage(artist.name).then(url => {
        _imgCache.set(artist.name, url);
        setImgUrl(url);
      });
    }, { threshold: 0.05 });
    if (cardRef.current) obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, [artist.name, imgUrl]);

  const initials = artist.name
    .split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();

  return (
    <Link ref={cardRef} to={`/artist/${encodeURIComponent(artist.name)}`} className="artist-card">
      <div className="artist-avatar">
        {imgUrl
          ? <img src={imgUrl} alt={artist.name} className="artist-img" loading="lazy" />
          : <span className="artist-initials">{initials}</span>
        }
      </div>
      <span className="artist-name">{artist.name}</span>
      <span className="artist-song-count">{artist.song_count} songs</span>
    </Link>
  );
}

export default function ArtistsPage() {
  const [artists, setArtists]         = useState([]);
  const [q, setQ]                     = useState("");
  const [activeLetter, setActiveLetter] = useState("A");
  const [loading, setLoading]         = useState(true);

  const load = useCallback((query, letter) => {
    setLoading(true);
    const params = query
      ? `q=${encodeURIComponent(query)}&limit=200`
      : `letter=${encodeURIComponent(letter)}&limit=200`;
    fetch(`${process.env.REACT_APP_API_URL}/artists?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setArtists(data); setLoading(false); })
      .catch(() => { setArtists([]); setLoading(false); });
  }, []);

  useEffect(() => {
    load(q, activeLetter);
  }, [q, activeLetter]); // eslint-disable-line

  const handleSearch = useCallback(e => {
    setQ(e.target.value);
  }, []);

  const handleLetter = useCallback(l => {
    setQ("");
    setActiveLetter(l);
  }, []);

  return (
    <div className="page">
      <Helmet>
        <title>Artists — ChordQuest</title>
      </Helmet>

      <div className="artists-container">
        <div className="artists-header-row">
          <h1 className="artists-title">Artists</h1>
          <input
            className="artists-search"
            type="search"
            placeholder="Search artists…"
            value={q}
            onChange={handleSearch}
            autoComplete="off"
          />
        </div>

        {/* A–Z index bar */}
        <div className="az-index">
          {LETTERS.map(l => (
            <button
              key={l}
              className={`az-btn${!q && activeLetter === l ? " az-btn-active" : ""}`}
              onClick={() => handleLetter(l)}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loader" style={{ marginTop: "48px" }}>Loading…</div>
        ) : artists.length === 0 ? (
          <p className="profile-hint" style={{ marginTop: "32px" }}>
            {q ? `No artists found for "${q}".` : `No artists under ${activeLetter}.`}
          </p>
        ) : (
          <div className="artists-grid">
            {artists.map(a => <ArtistCard key={a.name} artist={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
