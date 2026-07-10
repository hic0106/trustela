// Next 16 Proxy (구 Middleware) — 요청마다 Supabase 세션을 갱신한다.
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // 정적 자산·이미지 최적화·favicon 은 제외하고 나머지 경로에서만 실행.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
