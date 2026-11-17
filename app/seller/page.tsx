import SellerApp from "./seller-app";
import "../admin/admin.css";
import "./seller.css";

export const dynamic = "force-static";

export const metadata = {
  title: "Seller portal | ASMS–ROUNAQH",
  description: "List your property with ASMS–ROUNAQH. Every listing is reviewed before it goes live.",
  robots: { index: false, follow: false },
};

export default function SellerPage() {
  return <SellerApp />;
}
