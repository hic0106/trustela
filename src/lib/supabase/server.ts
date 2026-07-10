// 서버(서버 컴포넌트 · 라우트 핸들러)용 Supabase 클라이언트.
// Next 16 의 async cookies() 에 바인딩 → 세션이 요청 쿠키로 흐른다. RLS 적용.
// 서버 컴포넌트에서는 쿠키 쓰기가 불가하므로 set 실패를 무시한다(세션 갱신은 proxy 가 담당).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // 서버 컴포넌트 렌더 중 호출 — proxy 가 세션을 갱신하므로 무시해도 안전.
          }
        },
      },
    },
  );
}

/** 현재 로그인 사용자를 반환(없으면 null). 라우트 핸들러/서버 컴포넌트에서 사용. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
