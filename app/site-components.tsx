import Link from "next/link";

export function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`eyebrow${light ? " eyebrow-light" : ""}`}><i />{children}</div>;
}

export function Header({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={`site-header${overlay ? " header-overlay" : ""}`}>
      <div className="page-shell nav-wrap">
        <Link className="brand" href="/" aria-label="ASMS–ROUNAQH home">
          <span className="brand-mark">AR</span>
          <span className="brand-type"><strong>ASMS–ROUNAQH</strong><small>Realty · Build · Supply</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <a href="/#why-us">About</a>
          <Link href="/properties">Properties</Link>
          <a href="/#products">Products</a>
          <a href="/#divisions">Services</a>
        </nav>
        <a className="nav-contact" href="/#contact">Let’s talk <span aria-hidden="true">↗</span></a>
        <details className="mobile-menu">
          <summary aria-label="Open navigation"><span /><span /></summary>
          <nav>
            <Link href="/">Home</Link>
            <a href="/#why-us">About</a>
            <Link href="/properties">Properties</Link>
            <a href="/#products">Products</a>
            <a href="/#divisions">Services</a>
            <a href="/#contact">Contact</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

export type PropertyCardProps = {
  image: string;
  reference: string;
  location: string;
  title: string;
  type: string;
  area: string;
  price: string;
  status: string;
};

export function PropertyCard(props: PropertyCardProps) {
  return (
    <article className="property-card">
      <div className="property-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={props.image} alt="Property preview placeholder" />
        <span className="status-chip">{props.status}</span>
        <span className="card-arrow" aria-hidden="true">↗</span>
      </div>
      <div className="property-body">
        <div className="property-location"><span>⌖</span>{props.location}<small>{props.reference}</small></div>
        <h3>{props.title}</h3>
        <div className="property-meta"><span>{props.type}</span><span>{props.area}</span></div>
        <div className="property-price"><small>Asking price</small><strong>{props.price}</strong></div>
      </div>
    </article>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-grid">
        <div className="footer-brand">
          <Link className="brand" href="/"><span className="brand-mark">AR</span><span className="brand-type"><strong>ASMS–ROUNAQH</strong><small>Realty · Build · Supply</small></span></Link>
          <p>A Chennai-based business across real estate, construction products and engineering services.</p>
        </div>
        <div><h3>Explore</h3><Link href="/properties">Properties</Link><a href="/#products">Products</a><a href="/#divisions">Services</a><a href="/#why-us">About us</a></div>
        <div><h3>Contact</h3><span>Verified address to be added</span><span>Phone number to be added</span><span>Business email to be added</span></div>
        <div><h3>Information</h3><a href="#">Privacy policy</a><a href="#">Terms of use</a><span>Registration details pending</span></div>
      </div>
      <div className="page-shell footer-bottom"><span>© ASMS–ROUNAQH</span><span>Designed around trust, clarity and evidence.</span></div>
    </footer>
  );
}
