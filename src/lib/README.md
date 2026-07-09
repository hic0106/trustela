# src/lib — Trustela 도메인 로직

Phase 1(GEO 추적) 데이터 흐름:

```
프롬프트 등록 → [scheduler] 정기 실행 → [engines] LLM 호출
   → [parsing] 브랜드 언급/순위 탐지 → [scoring] 전환형 인용 분류
   → [metrics] Share of Voice → 대시보드
```

| 경로 | 역할 | 상태 | PRD |
|------|------|------|-----|
| `types.ts` | 도메인 핵심 타입 | ✅ | — |
| `engines/connector.ts` | LLM 커넥터 계약·레지스트리 | 🔲 스텁 (키 필요) | E2 |
| `parsing/detectMentions.ts` | 언급/순위 탐지 | 🔲 스텁 | E3 |
| `scoring/classifyCitation.ts` | ⭐ 전환형 인용 분류 (차별화) | 🔲 스텁 | E5 |
| `metrics/shareOfVoice.ts` | Share of Voice 계산 | ✅ 구현 (순수 함수) | E4 |

- 🔲 스텁은 호출 시 명시적으로 not-implemented를 던진다 — "동작하는 척" 하지 않는다.
- 커넥터/분류기 구현에는 API 키가 필요하며, 키 발급·결제는 **사용자 본인** 작업.
- 아직 없는 것: 스케줄러(`scheduler/`), 저장소(`storage/`), 계정·과금(E7). 개발 진행하며 추가.
