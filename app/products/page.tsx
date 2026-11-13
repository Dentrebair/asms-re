import { isSample, productCategories, productCount } from "@/lib/content";
import Catalog, { type CatalogSort } from "../catalog";
import { Footer, Header, ListingCardFor, creditsFor } from "../site-components";

const SORTS: CatalogSort[] = [
  { value: "recommended", label: "Recommended", kind: "order" },
  { value: "name", label: "Name, A to Z", kind: "text", attr: "name" },
];

export const dynamic = "force-static";

export const metadata = {
  title: "Construction products | ASMS‑ROUNAQH",
  description: "Structural steel, PEB components, roofing, building materials, concrete and finishing products with clear specifications.",
};

const quoteHref = (product: string) =>
  `/contact?category=${encodeURIComponent("Construction products")}&interest=${encodeURIComponent(product)}`;

export default function ProductsPage() {
  const products = productCategories.flatMap((category) => category.products.map((product) => ({ product, category })));
  const credits = creditsFor(products.map(({ product }) => product));

  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Steel, roofing and concrete products</h1>
            <p className="lead">Compare grades and standards, then request a quote for your site.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-label="Product catalogue">
          <div className="container">
            {isSample && <p className="notice">Design preview: product lines and specifications are typical industry values, not confirmed stock, and the photographs are illustrative. Prices are quoted per enquiry.</p>}
            {productCount === 0 ? (
              <p className="empty-state">Our catalogue is being updated. <a className="link" href={quoteHref("Product enquiry")}>Send your requirement</a> and we will respond with options.</p>
            ) : (
              <Catalog
                label="Products"
                tabs={{ name: "category", attr: "category", label: "Product category", allLabel: "All products", options: productCategories.map((category) => ({ value: category.id, label: category.name })) }}
                search="Product, grade or standard"
                sorts={SORTS}
                notes={productCategories.map((category) => ({ value: category.id, text: category.intro }))}
                total={productCount}
              >
                {products.map(({ product, category }, i) => (
                  <li key={product.slug} data-order={i} data-category={category.id} data-name={product.name}
                    data-search={[product.name, product.summary, category.name, ...product.specs.map((x) => x.value)].join(" ").toLowerCase()}>
                    <ListingCardFor product={product} categoryName={category.name} />
                  </li>
                ))}
              </Catalog>
            )}
          </div>
        </section>

        <section className="band on-field" aria-labelledby="quote-title">
          <div className="container">
            <div className="head-split">
              <h2 id="quote-title">A useful quote starts with the specification</h2>
            </div>
            <ol className="steps">
              <li><h3>Share the specification</h3><p>Product, grade, size and any standard or brand your project requires.</p></li>
              <li><h3>Confirm quantity and site</h3><p>Approximate quantity, delivery location and the date you need it on site.</p></li>
              <li><h3>Receive a clear quote</h3><p>Itemised pricing with taxes, delivery and lead time stated upfront.</p></li>
            </ol>
            <div className="steps-close">
              <div>
                <h3>Need something not listed here?</h3>
                <p>Send your bill of quantities or drawings and we will tell you what we can supply.</p>
              </div>
              <div className="actions">
                <a className="btn" href={quoteHref("Custom / bulk requirement")}>Send your requirement</a>
                <a className="link" href="/">Return home</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer credits={credits} />
    </>
  );
}
