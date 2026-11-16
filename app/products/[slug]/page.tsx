import { notFound } from "next/navigation";
import { isSample, productCategories } from "@/lib/content";
import { BRAND, Footer, Header, ListingCardFor, creditsFor } from "../../site-components";
import QuoteForm from "./quote-form";
import { ForestTheme } from "../../astryx/themes";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";

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
  if (!found) notFound();
  const { product: p, category } = found;
  const related = category.products.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <Header />
      <main id="main">
        <section className="band band--tight" aria-labelledby="product-title">
          <div className="page">
            <VStack gap={6}>
              <Breadcrumbs label="Breadcrumb">
                <BreadcrumbItem href="/">Home</BreadcrumbItem>
                <BreadcrumbItem href="/products">Products</BreadcrumbItem>
                <BreadcrumbItem href={`/products?category=${category.id}`} isCurrent>{category.name}</BreadcrumbItem>
              </Breadcrumbs>
              <Grid columns={{ minWidth: 340, repeat: "fit" }} gap={10} align="start">
                <div className="card-photo">
                  <AspectRatio ratio={4 / 3}>
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image.src} alt={p.image.alt || p.name} width={1200} height={900} fetchPriority="high" />
                    ) : <span className="photo-missing" aria-hidden="true" />}
                  </AspectRatio>
                </div>
                <VStack gap={5}>
                  <div><Badge label={category.name} variant="warning" /></div>
                  <Heading level={1} type="display-2" id="product-title" textWrap="balance">{p.name}</Heading>
                  <Text type="large" color="secondary" as="p">{p.summary}</Text>
                  <Card padding={5}>
                    <MetadataList>
                      {p.specs.map((x) => <MetadataListItem key={x.label} label={x.label}>{x.value}</MetadataListItem>)}
                      {p.unit && <MetadataListItem label="Priced">{p.unit}, quoted per enquiry</MetadataListItem>}
                      {p.availability && <MetadataListItem label="Availability">{p.availability} (indicative)</MetadataListItem>}
                    </MetadataList>
                  </Card>
                  {p.suitableUse && <Text as="p"><strong>Suitable for:</strong> {p.suitableUse}</Text>}
                  <div><Button href="#quote" label="Request a quote" variant="primary" size="lg" /></div>
                  {isSample && <Banner status="info" title="Design preview" description="Specifications are typical industry values, not confirmed stock, and the photograph is illustrative." />}
                </VStack>
              </Grid>
            </VStack>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" id="quote" aria-label="Quote request">
            <div className="page">
              <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={10} align="start">
                <VStack gap={3}>
                  <Heading level={2} type="display-3">What a useful quote needs</Heading>
                  <Text type="large" color="secondary" as="p">Tell us the grade or size, the quantity, and where it should be delivered. We reply with itemised pricing, taxes, delivery and lead time.</Text>
                </VStack>
                <Card padding={6} elevation="med"><QuoteForm slug={p.slug} name={p.name} /></Card>
              </Grid>
            </div>
          </section>
        </ForestTheme>

        {related.length > 0 && (
          <section className="band band--tight" aria-labelledby="related-title">
            <div className="page">
              <VStack gap={6}>
                <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
                  <Heading level={2} type="display-3" id="related-title">More in {category.name.toLowerCase()}</Heading>
                  <Button href={`/products?category=${category.id}`} label="See the whole category" variant="secondary" />
                </HStack>
                <ul className="card-grid">{related.map((x) => <li key={x.slug}><ListingCardFor product={x} categoryName={category.name} /></li>)}</ul>
              </VStack>
            </div>
          </section>
        )}
      </main>
      <Footer credits={creditsFor([p, ...related])} />
    </>
  );
}
