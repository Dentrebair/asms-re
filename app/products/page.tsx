import { isSample, productCategories, productCount } from "@/lib/content";
import { CATEGORY_ICONS } from "@/lib/presets";
import type { IconName } from "../icons";
import { Icon } from "../icons";
import { Footer, Header, SectionLabel } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "Construction Products | ASMS–ROUNAQH",
  description: "Structural steel, PEB components, roofing, building materials, concrete and finishing products with clear specifications.",
};

const iconFor = (icon: string): IconName => (CATEGORY_ICONS.includes(icon as IconName) ? (icon as IconName) : "layers");

const quoteHref = (product: string) =>
  `/contact?category=${encodeURIComponent("Construction products")}&interest=${encodeURIComponent(product)}`;

export default function ProductsPage() {
  return (
    <main className="products-page">
      <Header />
      <section className="listing-hero">
        <div className="page-shell listing-title">
          <div>
            <SectionLabel>Construction products</SectionLabel>
            <h1>Materials specified for <em>the work ahead.</em></h1>
          </div>
          <p>Compare grades, sizes and standards at a glance, then request a quotation for the quantity and delivery location you need.</p>
        </div>
        <nav className="page-shell category-bar" aria-label="Product categories">
          {productCategories.map((category) => (
            <a key={category.id} href={`#${category.id}`}>
              <Icon name={iconFor(category.icon)} />
              <span><strong>{category.name}</strong><small>{category.products.length} products</small></span>
            </a>
          ))}
        </nav>
      </section>

      <section className="listing-content page-shell section-space">
        <div className="listing-toolbar">
          <div><strong>Product catalogue</strong><span>{productCount} product lines · {productCategories.length} categories</span></div>
        </div>
        {isSample && <div className="preview-notice">Design preview — product lines and specifications shown are typical industry values, not confirmed stock. Prices are quoted per enquiry.</div>}
        {productCount === 0 && <p className="empty-state">Our catalogue is being updated. <a href={quoteHref("Product enquiry")}>Send your requirement</a> and we’ll respond with options.</p>}

        {productCategories.map((category) => (
          <section key={category.id} id={category.id} className="product-category">
            <header>
              <span className="category-icon"><Icon name={iconFor(category.icon)} size={26} /></span>
              <div><h2>{category.name}</h2><p>{category.intro}</p></div>
            </header>
            <div className="product-grid">
              {category.products.map((product) => (
                <article key={product.slug} className="product-card">
                  <figure className="product-image">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image.srcSmall} alt={product.image.alt || product.name} width={800} height={600} loading="lazy" decoding="async" />
                    ) : <div className="image-missing" aria-hidden="true"><Icon name={iconFor(category.icon)} size={34} /></div>}
                    {product.image?.credit && <span className="status-chip">Illustrative photo</span>}
                    {product.image?.credit && (
                      <figcaption>
                        <a href={product.image.credit.source} target="_blank" rel="noopener noreferrer">Photo: {product.image.credit.artist}</a>
                        {" · "}
                        {product.image.credit.licenseUrl ? <a href={product.image.credit.licenseUrl} target="_blank" rel="noopener noreferrer">{product.image.credit.license}</a> : product.image.credit.license}
                      </figcaption>
                    )}
                  </figure>
                  <h3>{product.name}</h3>
                  <p>{product.summary}</p>
                  <dl>{product.specs.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                  <footer>
                    <span><small>Pricing</small><strong>Quote on request</strong>{product.unit && <small>{product.unit}</small>}</span>
                    <a className="button button-green" href={quoteHref(product.name)}>Request quote</a>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="buyer-guide">
        <div className="page-shell buyer-guide-inner">
          <div>
            <SectionLabel light>How quotations work</SectionLabel>
            <h2>A useful quote starts with the right specification.</h2>
          </div>
          <div className="guide-points">
            <article><span>01</span><h3>Share the specification</h3><p>Product, grade, size and any standard or brand your project requires.</p></article>
            <article><span>02</span><h3>Confirm quantity &amp; site</h3><p>Approximate quantity, delivery location and the date you need it on site.</p></article>
            <article><span>03</span><h3>Receive a clear quote</h3><p>Itemised pricing with taxes, delivery and lead time stated upfront.</p></article>
          </div>
        </div>
      </section>

      <section className="listing-cta page-shell section-space">
        <div>
          <SectionLabel>Bulk &amp; project supply</SectionLabel>
          <h2>Need something not listed here?</h2>
          <p>Send your bill of quantities or drawings and we’ll tell you what we can supply.</p>
        </div>
        <div><a className="button button-green" href={quoteHref("Custom / bulk requirement")}>Send your requirement</a><a className="text-link" href="/">Return home →</a></div>
      </section>
      <Footer />
    </main>
  );
}
