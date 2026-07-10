// 로그아웃 — 세션 쿠키를 지우고 홈으로.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(request.url).origin), { status: 303 });
}
