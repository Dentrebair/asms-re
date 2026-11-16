import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Badge } from "@astryxdesign/core/Badge";
import { Heading, Text } from "@astryxdesign/core/Text";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, VStack } from "@astryxdesign/core/Layout";

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
    <ClickableCard href={href} label={ariaLabel ?? title} padding={3} className="listing-card">
      <VStack gap={4} height="100%">
        <div className="card-photo">
          <AspectRatio ratio={4 / 3}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.src} alt={image.alt || title} width={800} height={600} loading={priority ? "eager" : "lazy"} decoding="async" />
            ) : <span className="photo-missing" aria-hidden="true" />}
          </AspectRatio>
          {tag && <Badge label={tag} variant="neutral" />}
        </div>
        <VStack gap={3} padding={1}>
          <Heading level={3} maxLines={2}>{title}</Heading>
          {summary && <Text color="secondary" maxLines={2} as="p">{summary}</Text>}
          {facts.length > 0 && (
            <MetadataList orientation="horizontal">
              {facts.map((f) => <MetadataListItem key={f.label} label={f.label}>{f.value}</MetadataListItem>)}
            </MetadataList>
          )}
          <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
            <Text type="large" weight="bold" hasTabularNumbers>{value}</Text>
            {meta && <Text type="supporting">{meta}</Text>}
          </HStack>
        </VStack>
      </VStack>
    </ClickableCard>
  );
}
