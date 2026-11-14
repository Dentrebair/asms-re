/**
 * The one card skeleton for properties and products: a photo with a tag, the
 * title, an optional line, a short list of facts, and a footer with the value
 * (price or quote) and a meta line (reference or unit). Callers pass data only.
 */
export type ListingCardData = {
  href: string;
  title: string;
  image?: { src: string; alt?: string } | null;
  tag?: string | null;
  summary?: string | null;
  facts: { label: string; value: string }[];
  value: string;
  meta?: string | null;
  ariaLabel?: string;
};

export function ListingCard({ card, priority = false }: { card: ListingCardData; priority?: boolean }) {
  const { href, title, image, tag, summary, facts, value, meta, ariaLabel } = card;
  return (
    <a className="card" href={href} aria-label={ariaLabel}>
      <figure className="card-photo">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.src} alt={image.alt || title} width={800} height={600} loading={priority ? "eager" : "lazy"} decoding="async" />
        ) : <span className="photo-missing" aria-hidden="true" />}
        {tag && <span className="tag">{tag}</span>}
      </figure>
      <h3>{title}</h3>
      {summary && <p className="card-summary">{summary}</p>}
      {facts.length > 0 && (
        <dl className="card-facts">
          {facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
      )}
      <p className="card-foot"><span className="num">{value}</span>{meta && <small>{meta}</small>}</p>
    </a>
  );
}
