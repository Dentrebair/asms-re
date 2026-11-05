import { areaLabel, priceLabel, type PropertyRecord } from "@/lib/content";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#why-us", label: "About" },
  { href: "/properties", label: "Properties" },
  { href: "/products", label: "Products" },
  { href: "/#divisions", label: "Services" },
];

export function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`eyebrow${light ? " eyebrow-light" : ""}`}><i />{children}</div>;
}

function Brand({ label }: { label?: string }) {
  return (
    <a className="brand" href="/" aria-label={label}>
      <span className="brand-mark">AR</span>
      <span className="brand-type"><strong>ASMS–ROUNAQH</strong><small>Realty · Build · Supply</small></span>
    </a>
  );
}

function NavLinks() {
  return NAV_LINKS.map(({ href, label }) => <a key={href} href={href}>{label}</a>);
}

export function Header({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={`site-header${overlay ? " header-overlay" : ""}`}>
      <div className="page-shell nav-wrap">
        <Brand label="ASMS–ROUNAQH home" />
        <nav className="desktop-nav" aria-label="Primary navigation"><NavLinks /></nav>
        <a className="nav-contact" href="/contact">Let’s talk <span aria-hidden="true">↗</span></a>
        <details className="mobile-menu">
          <summary aria-label="Open navigation"><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            <NavLinks />
            <a href="/contact">Contact</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function PropertyCard({ property, priority = false }: { property: PropertyRecord; priority?: boolean }) {
  const { slug, images, reference, location, title, propertyType, statusLabel } = property;
  const image = images[0];
  return (
    <a className="property-card" href={`/properties/${slug}`} aria-label={`View ${title}`}>
      <div className="property-image">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.srcSmall} alt={image.alt || title} width={800} height={600} loading={priority ? "eager" : "lazy"} decoding="async" />
        ) : <div className="image-missing" aria-hidden="true">AR</div>}
        <span className="status-chip">{statusLabel}</span>
        <span className="card-arrow" aria-hidden="true">↗</span>
      </div>
      <div className="property-body">
        <div className="property-location"><span aria-hidden="true">⌖</span>{location}<small>{reference}</small></div>
        <h3>{title}</h3>
        <div className="property-meta"><span>{propertyType}</span><span>{areaLabel(property)}</span></div>
        <div className="property-price"><small>Asking price</small><strong>{priceLabel(property)}</strong></div>
      </div>
    </a>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-grid">
        <div className="footer-brand">
          <Brand />
          <p>A Chennai-based business across real estate, construction products and engineering services.</p>
        </div>
        <div><h3>Explore</h3><a href="/properties">Properties</a><a href="/products">Products</a><a href="/#divisions">Services</a><a href="/#why-us">About us</a></div>
        <div><h3>Contact</h3><a href="/contact">Send an enquiry</a><span>Verified address to be added</span><span>Phone number to be added</span><span>Business email to be added</span></div>
        <div><h3>Information</h3><span>Privacy policy (coming soon)</span><span>Terms of use (coming soon)</span><span>Registration details pending</span></div>
      </div>
      <div className="page-shell footer-bottom"><span>© ASMS–ROUNAQH</span><span>Designed around trust, clarity and evidence. · <a href="/admin" rel="nofollow">Staff login</a></span></div>
    </footer>
  );
}
