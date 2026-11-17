import { isSample, productCategories, productCount } from "@/lib/content";
import Catalog, { type CatalogSort } from "../catalog";
import { Footer, Header, ListingCardFor, PageHead, creditsFor } from "../site-components";
import { ForestTheme } from "../astryx/themes";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";

const SORTS: CatalogSort[] = [
  { value: "recommended", label: "Recommended", kind: "order" },
  { value: "name", label: "Name, A to Z", kind: "text", attr: "name" },
];

export const dynamic = "force-static";

export const metadata = {
  title: "Construction products | ASMS‑ROUNAQH",
  description: "Structural steel, PEB components, roofing, building materials, concrete and finishing products with clear specifications.",
  alternates: { canonical: "/products" },
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
        <PageHead crumb="Products" title="Steel, roofing and concrete products" lead="Compare grades and standards, then request a quote for your site." />

        <section className="band band--tight" aria-label="Product catalogue">
          <div className="page">
            <VStack gap={6}>
              {isSample && <Banner status="info" title="Design preview" description="Product lines and specifications are typical industry values, not confirmed stock, and the photographs are illustrative. Prices are quoted per enquiry." />}
              {productCount === 0 ? (
                <EmptyState title="Our catalogue is being updated" description="Send your requirement and we will respond with options."
                  actions={<Button href={quoteHref("Product enquiry")} label="Send your requirement" variant="primary" />} />
              ) : (
                <Catalog
                  label="Products"
                  itemName={["product", "products"]}
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
            </VStack>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" aria-labelledby="quote-title">
            <div className="page">
              <VStack gap={8}>
                <Heading level={2} type="display-3" id="quote-title">A useful quote starts with the specification</Heading>
                <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
                  {STEPS.map((step, i) => (
                    <Card key={step.title} padding={6}>
                      <VStack gap={2}>
                        <Text type="supporting" weight="bold" color="accent">Step {i + 1}</Text>
                        <Heading level={3}>{step.title}</Heading>
                        <Text color="secondary" as="p">{step.text}</Text>
                      </VStack>
                    </Card>
                  ))}
                </Grid>
                <HStack gap={6} hAlign="between" vAlign="center" wrap="wrap">
                  <VStack gap={1}>
                    <Heading level={3}>Need something not listed here?</Heading>
                    <Text color="secondary" as="p">Send your bill of quantities or drawings and we will tell you what we can supply.</Text>
                  </VStack>
                  <HStack gap={2} wrap="wrap">
                    <Button href={quoteHref("Custom / bulk requirement")} label="Send your requirement" variant="primary" />
                    <Button href="/" label="Return home" variant="ghost" />
                  </HStack>
                </HStack>
              </VStack>
            </div>
          </section>
        </ForestTheme>
      </main>
      <Footer credits={credits} />
    </>
  );
}

const STEPS = [
  { title: "Share the specification", text: "Product, grade, size and any standard or brand your project requires." },
  { title: "Confirm quantity and site", text: "Approximate quantity, delivery location and the date you need it on site." },
  { title: "Receive a clear quote", text: "Itemised pricing with taxes, delivery and lead time stated upfront." },
];
