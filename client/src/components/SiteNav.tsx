import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { HeroGuitar } from "./HeroGuitar";

export function SiteNav() {
  const { user } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <HeroGuitar className="navbar-logo" />
        <span className="navbar-title">ChordQuest</span>
      </Link>
      <div className="navbar-links">
        <Link to="/" className="navbar-link" activeProps={{ className: "navbar-link active" }} activeOptions={{ exact: true }}>Home</Link>
        <Link to="/library" className="navbar-link" activeProps={{ className: "navbar-link active" }}>Library</Link>
        <Link to="/about" className="navbar-link" activeProps={{ className: "navbar-link active" }}>About</Link>
        {user ? (
          <Link to="/profile" className="navbar-link" activeProps={{ className: "navbar-link active" }}>Profile</Link>
        ) : (
          <Link to="/auth" className="navbar-link navbar-cta">Sign In</Link>
        )}
      </div>
    </nav>
  );
}

export default SiteNav;
