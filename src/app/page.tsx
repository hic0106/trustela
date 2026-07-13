// 루트 — 로그인 사용자는 앱(/dashboard)으로 직행, 방문자에게만 랜딩을 보여준다.
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import Landing from "@/components/Landing";

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/dashboard");
  return <Landing />;
}
