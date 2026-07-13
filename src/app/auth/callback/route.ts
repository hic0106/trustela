// OAuth · 매직링크 로그인 후 돌아오는 곳. PKCE code 를 세션으로 교환하고 쿠키에 심는다.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(new URL(`/login?error=auth`, url.origin));
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}
