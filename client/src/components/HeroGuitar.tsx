export function HeroGuitar({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="100" cy="100" r="90" className="hero-guitar-body" />
      <circle cx="100" cy="100" r="35" className="hero-guitar-soundhole" />
      <rect x="96" y="10" width="8" height="180" rx="4" className="hero-guitar-neck" />
      <rect x="90" y="8" width="20" height="12" rx="2" className="hero-guitar-headstock" />
      <line x1="100" y1="20" x2="100" y2="190" className="hero-guitar-string" />
      <line x1="92" y1="20" x2="92" y2="190" className="hero-guitar-string" />
      <line x1="108" y1="20" x2="108" y2="190" className="hero-guitar-string" />
      <circle cx="100" cy="140" r="4" className="hero-guitar-dot" />
      <circle cx="100" cy="100" r="4" className="hero-guitar-dot" />
      <circle cx="100" cy="60" r="4" className="hero-guitar-dot" />
    </svg>
  );
}

export default HeroGuitar;
