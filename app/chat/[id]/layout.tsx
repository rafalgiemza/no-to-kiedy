import { Header } from "@/components/header";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header showGoBackButton={true} />
      <main className="mt-16">{children}</main>
    </div>
  );
}
