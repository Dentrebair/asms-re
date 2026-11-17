import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Badge } from "@astryxdesign/core/Badge";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Building2, Camera, LandPlot, MapPin, type LucideIcon } from "lucide-react";

/**
 * The one card for properties and products, portal style: photo (with a tag and a
 * photo count), the price or quote line first, the title, a location line, and up to
 * three short facts. In the catalogue's list view the same card lays out sideways
 * (see .card-grid[data-view="list"] in globals.css). Callers pass data only.
 */
export type ListingCardData = {
  href: string;
  title: string;
  image?: { src: string; alt?: string } | null;
  photoCount?: number;
  tag?: string | null;
  location?: string | null;
  summary?: string | null;
  facts: { label: string; value: string }[];
  value: string;
  meta?: string | null;
  ariaLabel?: string;
};

const FACT_ICONS: Record<string, LucideIcon> = { Type: Building2, Area: LandPlot };

export function ListingCard({ card, priority = false }: { card: ListingCardData; priority?: boolean }) {
  const { href, title, image, photoCount = 0, tag, location, summary, facts, value, meta, ariaLabel } = card;
  return (
    <ClickableCard href={href} label={ariaLabel ?? title} padding={0} className="listing-card">
      <div className="lc">
        <div className="card-photo lc-photo">
          <AspectRatio ratio={4 / 3}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.src} alt={image.alt || title} width={800} height={600} loading={priority ? "eager" : "lazy"} decoding="async" />
            ) : <span className="photo-missing" aria-hidden="true" />}
          </AspectRatio>
          {tag && <Badge label={tag} variant="warning" />}
          {photoCount > 1 && <span className="lc-count"><Camera size={14} aria-hidden="true" /> {photoCount}</span>}
        </div>
        <div className="lc-body">
          <VStack gap={2}>
            <Text type="large" weight="bold" hasTabularNumbers color="accent">{value}</Text>
            <Heading level={3} maxLines={2}>{title}</Heading>
            {location && (
              <HStack gap={1} vAlign="center" className="lc-muted">
                <MapPin size={14} aria-hidden="true" /><Text type="supporting" maxLines={1}>{location}</Text>
              </HStack>
            )}
            {summary && <Text color="secondary" maxLines={2} as="p">{summary}</Text>}
          </VStack>
          {facts.length > 0 && (
            <dl className="lc-facts">
              {facts.map((f) => {
                const Icon = FACT_ICONS[f.label];
                return (
                  <div key={f.label}>
                    <dt>{Icon ? <Icon size={15} aria-label={f.label} /> : `${f.label}:`}</dt>
                    <dd>{f.value}</dd>
                  </div>
                );
              })}
            </dl>
          )}
          {meta && <Text type="supporting" className="lc-meta">{meta}</Text>}
        </div>
      </div>
    </ClickableCard>
  );
}
