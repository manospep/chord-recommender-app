import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./App.css";

// Module-level cache so re-renders never re-fetch the same artist
const _imgCache = new Map();

function ArtistCard({ artist }) {
  const navigate   = useNavigate();
  const cardRef    = useRef(null);
  const cached     = _imgCache.get(artist.name);
  const [imgUrl, setImgUrl] = useState(cached !== undefined ? cached : null);

  useEffect(() => {
    if (imgUrl !== null) return; // already fetched or in-flight
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist.name)}`,
        { headers: { Accept: "application/json" } }
      )
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const url = data?.thumbnail?.source || "";
          _imgCache.set(artist.name, url);
          setImgUrl(url);
        })
        .catch(() => {
          _imgCache.set(artist.name, "");
          setImgUrl("");
        });
    }, { threshold: 0.05 });

    if (cardRef.current) obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, [artist.name, imgUrl]);

  const initials = artist.name
    .split(/\s+/)
    .map(w => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const slug = encodeURIComponent(artist.name);

  return (
    <Link ref={cardRef} to={`/artist/${slug}`} className="artist-card">
      <div className="artist-avatar">
        {imgUrl ? (
          <img src={imgUrl} alt={artist.name} className="artist-img" loading="lazy" />
        ) : (
          <span className="artist-initials">{initials}</span>
        )}
      </div>
      <span className="artist-name">{artist.name}</span>
      <span className="artist-song-count">{artist.song_count} songs</span>
    </Link>
  );
}

const LIMIT = 48;

export default function ArtistsPage() {
  const [artists, setArtists]   = useState([]);
  const [q, setQ]               = useState("");
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [hasMore, setHasMore]   = useState(true);

  const load = useCallback((query, off, replace) => {
    setLoading(true);
    fetch(
      `${process.env.REACT_APP_API_URL}/artists?q=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${off}`
    )
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setArtists(prev => replace ? data : [...prev, ...data]);
        setHasMore(data.length === LIMIT);
        setLoading(false);
      })
      .catch(() => { setArtists([]); setLoading(false); });
  }, []);

  useEffect(() => {
    setOffset(0);
    load(q, 0, true);
  }, [q]); // eslint-disable-line

  const handleSearch = useCallback(e => {
    setQ(e.target.value);
  }, []);

  const handleMore = useCallback(() => {
    const next = offset + LIMIT;
    setOffset(next);
    load(q, next, false);
  }, [offset, q, load]);

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

        {loading && artists.length === 0 ? (
          <div className="loader" style={{ marginTop: "60px" }}>Loading…</div>
        ) : artists.length === 0 ? (
          <p className="profile-hint" style={{ marginTop: "32px" }}>No artists found for "{q}".</p>
        ) : (
          <>
            <div className="artists-grid">
              {artists.map(a => <ArtistCard key={a.name} artist={a} />)}
            </div>
            {hasMore && !loading && (
              <button className="load-more-btn" onClick={handleMore}>
                Load more
              </button>
            )}
            {loading && artists.length > 0 && (
              <div className="loader" style={{ margin: "24px auto" }}>Loading…</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
