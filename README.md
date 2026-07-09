# Trustela

이커머스 브랜드가 ChatGPT·Perplexity 등 AI 검색에서 얼마나 추천되는지 측정하는 GEO 대시보드.
프롬프트를 각 엔진에 실행해 자사·경쟁사 **Share of Voice**, 순위, **전환형 인용**(추천 vs 단순 나열)을 낸다.

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 그리고 키를 채운다
npm run dev                        # http://localhost:3000
```

필요한 키(본인 발급): `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`.

### 검증 스크립트

```bash
npm run test:parser      # 파서 단위 검증(무료)
npm run test:engines     # 엔진 실호출(소량 비용)
npm run demo:analysis    # 통합 리포트  (CLASSIFY=1 로 전환형 인용까지)
npm run demo:classify    # 분류기 검증
```

## 배포 (Vercel + GitHub, 자동 배포)

> 배포는 **`git push origin main`** 으로만 한다. Vercel/Netlify CLI 직접 배포 금지.

1. GitHub에 리포 생성 후 원격 연결·push:
   ```bash
   git remote add origin https://github.com/<you>/trustela.git
   git push -u origin main
   ```
2. [vercel.com/new](https://vercel.com/new) 에서 이 GitHub 리포를 Import.
3. Vercel 프로젝트 **Settings → Environment Variables** 에 추가:
   `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` (선택: `OPENAI_MODEL`, `PERPLEXITY_MODEL`, `CLASSIFIER_MODEL`).
4. Deploy. 이후 `main` 에 push하면 자동 재배포.

⚠️ `/api/analyze` 는 엔진 호출로 수십 초가 걸린다. Vercel **Hobby 플랜의 함수 실행 시간 한도(최대 60초)** 에 걸릴 수 있으니, 데모 시엔 엔진 1개 또는 전환형 인용 off 로 시작하고, 프로덕션에선 큐/백그라운드 잡으로 옮기는 게 맞다.

## 상태

Phase 1 분석 코어 + 대시보드 완성. 미구현: 결과 DB 저장(시계열)·스케줄러·계정/과금.
자세한 아키텍처는 [`src/lib/README.md`](src/lib/README.md), 프로젝트 지침은 [`CLAUDE.md`](CLAUDE.md).
