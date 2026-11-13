import { notFound } from "next/navigation";
import { isSample, productCategories } from "@/lib/content";
import { BRAND, Footer, Header, ListingCardFor, creditsFor } from "../../site-components";
import QuoteForm from "./quote-form";

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

const all = productCategories.flatMap((category) => category.products.map((product) => ({ product, category })));
const find = (slug: string) => all.find((x) => x.product.slug === slug);

export function generateStaticParams() {
  return all.map(({ product }) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const found = find((await params).slug);
  if (!found) return {};
  return {
    title: `${found.product.name} | ${BRAND}`,
    description: `${found.product.name}: ${found.product.summary} Request a quote from ${BRAND}, Chennai.`,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const found = find((await params).slug);
  if (!found) notFound();
  const { product: p, category } = found;
  const related = category.products.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <Header />
      <main id="main">
        <section className="container detail-top">
          <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/products">Products</a><span>/</span><a href={`/products?category=${category.id}`}>{category.name}</a></nav>
        </section>

        <section className="container product-top" aria-labelledby="product-title">
          <figure className="product-photo">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image.src} alt={p.image.alt || p.name} width={1200} height={900} />
            ) : <span className="photo-missing" aria-hidden="true">AR</span>}
          </figure>
          <div className="product-intro">
            <span className="tag">{category.name}</span>
            <h1 id="product-title">{p.name}</h1>
            <p className="lead">{p.summary}</p>
            <dl className="spec-table">
              {p.specs.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
              {p.unit && <div><dt>Priced</dt><dd>{p.unit}, quoted per enquiry</dd></div>}
              {p.availability && <div><dt>Availability</dt><dd>{p.availability} (indicative)</dd></div>}
            </dl>
            {p.suitableUse && <p><strong>Suitable for:</strong> {p.suitableUse}</p>}
            <div className="actions"><a className="btn" href="#quote">Request a quote</a></div>
            {isSample && <p className="notice">Design preview: specifications are typical industry values, not confirmed stock, and the photograph is illustrative.</p>}
          </div>
        </section>

        <section className="sec sec--list" id="quote" aria-label="Quote request">
          <div className="container contact-split">
            <div className="contact-facts">
              <h2>What a useful quote needs</h2>
              <p>Tell us the grade or size, the quantity, and where it should be delivered. We reply with itemised pricing, taxes, delivery and lead time.</p>
            </div>
            <QuoteForm slug={p.slug} name={p.name} />
          </div>
        </section>

        {related.length > 0 && (
          <section className="container similar-section" aria-labelledby="related-title">
            <div className="head-split">
              <h2 id="related-title">More in {category.name.toLowerCase()}</h2>
              <div><a className="link" href={`/products?category=${category.id}`}>See the whole category</a></div>
            </div>
            <ul className="card-grid">{related.map((x) => <li key={x.slug}><ListingCardFor product={x} categoryName={category.name} /></li>)}</ul>
          </section>
        )}
      </main>
      <Footer credits={creditsFor([p, ...related])} />
    </>
  );
}
