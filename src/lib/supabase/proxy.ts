// 요청마다 Supabase 세션 토큰을 갱신한다(만료 임박 토큰 리프레시 + 쿠키 재기록).
// Next 16 Proxy(구 Middleware)에서 호출. 인가/리다이렉트는 여기서 하지 않는다
// (Proxy 는 optimistic 용도 — 실제 authz 는 라우트 핸들러/페이지에서).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() 호출이 만료 토큰을 리프레시하고 위 setAll 로 새 쿠키를 심는다.
  await supabase.auth.getUser();

  return response;
}
