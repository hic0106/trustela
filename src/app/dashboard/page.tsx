// 앱 대시보드 — 로그인 필수. 비로그인은 /login 으로.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Trustela",
};

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <Dashboard />;
}
