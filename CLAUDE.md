@AGENTS.md

# Trustela — 프로젝트 지침

## 무엇인가
이커머스 브랜드 대상 SaaS. 등록한 핵심 프롬프트(예: "최고의 무알콜 와인 브랜드는?")를
ChatGPT·Perplexity 등 AI에 정기 실행해 **자사 브랜드가 추천되는지 측정**하고,
경쟁사 대비 Share of Voice와 **"전환으로 이어지는 인용"**을 시계열로 보여준다.

- working name `Trustela` (확정 전 플레이스홀더 — 브랜드명 변경 시 일괄 치환)
- Phase 1: GEO 추적 (지금 여기). Phase 2: 리뷰 신뢰 인증(애드온, B2B).
- 상세 스펙: 팀 채팅의 "Trustela Phase 1 PRD v0.1" 참조.

## 기술 스택
- Next.js 16 (App Router) + TypeScript + Tailwind, 단일 리포 (프론트+API Route).
- DB: Postgres (Supabase/Neon 예정) · 큐: Upstash QStash/Vercel Cron 예정 — 아직 미연결.
- `src/lib/` 에 도메인 로직 뼈대(엔진 커넥터·파서·스코어러·지표). `src/lib/README.md` 참조.

## 실행
- 개발 서버: `npm run dev`
- 빌드: `npm run build`
- 린트: `npm run lint`

## 주의 (중요)
- **API 키(OpenAI·Perplexity·Gemini)·결제·도메인·배포는 전부 사용자 본인 작업.** 대신 처리 금지.
- 키 없이는 엔진 커넥터가 동작하지 않는다 — 스텁은 명시적으로 not-implemented를 던진다.
- 검증 없이 "동작한다" 주장 금지. 수정 후 `npm run build`/`lint`로 확인.
- USPTO 상표·도메인 실구매 확인은 미완료 — 브랜드 확정 전까지 이름은 플레이스홀더.
