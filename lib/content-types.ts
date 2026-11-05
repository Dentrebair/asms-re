// Shape of content/content.json. The committed file holds sample data; in CI,
// scripts/pull-content.mjs overwrites it with published rows from Supabase.

export type ImageCredit = { artist: string; license: string; licenseUrl: string; source: string };

export type SiteImage = {
  src: string;
  srcSmall: string;
  alt: string;
  credit?: ImageCredit | null;
};

export type NearbyPlace = { group: string; name: string; distance: string };
export type DocumentStatus = { label: string; status: string };
export type Spec = { label: string; value: string };

export type PropertyRecord = {
  slug: string;
  reference: string;
  title: string;
  featured: boolean;
  statusLabel: string;
  propertyType: string;
  transactionType: string | null;
  ownership: string | null;
  location: string;
  locality: string | null;
  price: number | null;
  areaSqFt: number | null;
  dimensions: string | null;
  facing: string | null;
  roadWidth: string | null;
  approval: string | null;
  rera: string | null;
  cornerPlot: boolean | null;
  boundaryWall: boolean | null;
  gatedLayout: boolean | null;
  floorsAllowed: string | null;
  availability: string | null;
  description: string | null;
  amenities: string[];
  nearby: NearbyPlace[];
  documents: DocumentStatus[];
  images: SiteImage[];
  postedOn: string | null;
};

export type ProductCategory = { id: string; name: string; icon: string; intro: string };

export type ProductRecord = {
  slug: string;
  categoryId: string;
  name: string;
  summary: string;
  specs: Spec[];
  unit: string;
  image: SiteImage | null;
};

export type SiteContent = {
  source: "sample" | "supabase";
  generatedAt: string | null;
  properties: PropertyRecord[];
  categories: ProductCategory[];
  products: ProductRecord[];
};
