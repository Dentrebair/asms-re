// Icons for admin fields, matched by label. Only fields where an icon says something
// (a place, money, a measurement, a document) get one; plain text fields stay bare.
import type { IconType } from "@astryxdesign/core/Icon";
import {
  ArrowLeftRight, BadgeCheck, Bath, BedDouble, Building, Building2, CalendarCheck, Car, Compass, DoorOpen,
  FileText, Hash, IndianRupee, KeyRound, Landmark, LandPlot, Layers, Link, Mail, Map, MapPin, Route, Ruler,
  ShieldCheck, Signpost, Sofa, Tag, Trees, User,
} from "lucide-react";

const BY_LABEL: [RegExp, IconType][] = [
  [/^Reference$/, Hash],
  [/^Web address/, Link],
  [/^Location$/, MapPin],
  [/^Locality/, Landmark],
  [/^Google Maps/, Map],
  [/^Price \(/, IndianRupee],
  [/^Pricing unit$/, Tag],
  [/(^Area|area) \(/, LandPlot],
  [/^(Dimensions|Frontage)/, Ruler],
  [/^Road width/, Route],
  [/^Access$/, DoorOpen],
  [/^Bedrooms/, BedDouble],
  [/^Bathrooms/, Bath],
  [/^Parking$/, Car],
  [/^Floor$/, Layers],
  [/^Floors allowed$/, Building],
  [/^Property type$/, Building2],
  [/^Facing$/, Compass],
  [/^Possession$/, KeyRound],
  [/^Furnishing$/, Sofa],
  [/^Land use$/, Trees],
  [/^Zoning notes$/, Signpost],
  [/^Approval$/, BadgeCheck],
  [/^RERA/, ShieldCheck],
  [/^Ownership$/, FileText],
  [/^Transaction type$/, ArrowLeftRight],
  [/^Availability$/, CalendarCheck],
  [/^Email$/, Mail],
  [/^Name$/, User],
];

export const iconFor = (label: string): IconType | undefined => BY_LABEL.find(([re]) => re.test(label))?.[1];
