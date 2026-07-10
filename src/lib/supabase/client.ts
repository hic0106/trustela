// 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
// anon 키 + 쿠키 기반 세션. RLS 가 데이터 접근을 사용자별로 제한한다.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
