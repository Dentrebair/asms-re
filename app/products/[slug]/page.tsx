import { isSample, productCategories } from "@/lib/content";
import { BRAND, Footer, Header, ListingCardFor, NotAvailablePage, creditsFor } from "../../site-components";
import QuoteForm from "./quote-form";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Carousel } from "@astryxdesign/core/Carousel";
import { Divider } from "@astryxdesign/core/Divider";
import { HardHat, Tag } from "lucide-react";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

const all = productCategories.flatMap((category) => category.products.map((product) => ({ product, category })));
const find = (slug: string) => all.find((x) => x.product.slug === slug);

// A static export must build at least one page per route. With nothing published
// yet, a single placeholder is built and renders the not-found page.
export function generateStaticParams() {
  const params = all.map(({ product }) => ({ slug: product.slug }));
  return params.length ? params : [{ slug: "none" }];
}

export async function generateMetadata({ params }: { params: Params }) {
  const found = find((await params).slug);
  if (!found) return { title: `Product not available | ${BRAND}`, robots: { index: false } };
  const { product } = found;
  const description = `${product.name}: ${product.summary} Request a quote from ${BRAND}, Chennai.`;
  return {
    title: `${product.name} | ${BRAND}`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description, url: `/products/${product.slug}`, images: product.image ? [{ url: product.image.src, alt: product.image.alt || product.name }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const found = find((await params).slug);
  // Only the empty-catalogue placeholder gets here (dynamicParams is false).
  if (!found) return <NotAvailablePage crumb="Products" title="This product isn’t listed" lead="Product details are being prepared. Ask us for a quote and the team will get back to you." />;
  const { product: p, category } = found;
  const related = category.products.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <Header />
      <main id="main">
        <section className="detail-head">
          <div className="page">
            <Breadcrumbs label="Breadcrumb">
              <BreadcrumbItem href="/">Home</BreadcrumbItem>
              <BreadcrumbItem href="/products">Products</BreadcrumbItem>
              <BreadcrumbItem href={`/products?category=${category.id}`} isCurrent>{category.name}</BreadcrumbItem>
            </Breadcrumbs>
          </div>
        </section>

        <section className="band band--tight" style={{ paddingTop: 0 }} aria-labelledby="product-title">
          <div className="page detail-grid">
            <VStack gap={6}>
              <div className="card-photo product-photo">
                <AspectRatio ratio={4 / 3}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image.src} alt={p.image.alt || p.name} width={1200} height={900} fetchPriority="high" />
                  ) : <span className="photo-missing" aria-hidden="true" />}
                </AspectRatio>
              </div>
              <VStack gap={3}>
                <Heading level={2}>Specifications</Heading>
                <dl className="detail-table">
                  {p.specs.map((x) => <div key={x.label}><dt>{x.label}</dt><dd>{x.value}</dd></div>)}
                  {p.unit && <div><dt>Priced</dt><dd>{p.unit}, quoted per enquiry</dd></div>}
                  {p.availability && <div><dt>Availability</dt><dd>{p.availability} (indicative)</dd></div>}
                </dl>
              </VStack>
              {p.suitableUse && (
                <Card variant="muted" padding={5}>
                  <HStack gap={3} vAlign="start"><span className="icon-line"><HardHat size={20} aria-hidden="true" /></span>
                    <VStack gap={1}><Text weight="bold">Suitable for:</Text><Text color="secondary" as="p">{p.suitableUse}</Text></VStack>
                  </HStack>
                </Card>
              )}
              {isSample && <Banner status="info" title="Design preview" description="Specifications are typical industry values, not confirmed stock, and the photograph is illustrative." />}
            </VStack>

            <aside className="detail-rail" id="quote">
              <Card padding={6} elevation="med">
                <VStack gap={5}>
                  <VStack gap={2}>
                    <div><Badge label={category.name} variant="warning" /></div>
                    <Heading level={1} type="display-3" id="product-title" textWrap="balance">{p.name}</Heading>
                    <Text color="secondary" as="p">{p.summary}</Text>
                    <HStack gap={2} vAlign="center"><Tag size={16} aria-hidden="true" /><Text weight="bold">Quote on request{p.unit ? ` · ${p.unit.toLowerCase()}` : ""}</Text></HStack>
                  </VStack>
                  <Divider />
                  <QuoteForm slug={p.slug} name={p.name} />
                </VStack>
              </Card>
            </aside>
          </div>
        </section>

        {related.length > 0 && (
          <section className="band band--tight band--muted" aria-labelledby="related-title">
            <div className="page">
              <VStack gap={5}>
                <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
                  <Heading level={2} type="display-3" id="related-title">More in {category.name.toLowerCase()}</Heading>
                  <Button href={`/products?category=${category.id}`} label="See the whole category" variant="secondary" />
                </HStack>
                <Carousel aria-label={`More in ${category.name}`} gap={4} hasSnap>
                  {related.map((x) => <div key={x.slug} className="carousel-card"><ListingCardFor product={x} categoryName={category.name} /></div>)}
                </Carousel>
              </VStack>
            </div>
          </section>
        )}
      </main>
      <Footer credits={creditsFor([p, ...related])} />
    </>
  );
}
