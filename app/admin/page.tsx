import AdminApp from "./admin-app";
import "./admin.css";

export const dynamic = "force-static";

export const metadata = {
  title: "Admin | ASMS–ROUNAQH",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
