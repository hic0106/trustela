"use client";

import type { HistoryPoint } from "@/lib/types";

// 브랜드 라인 색상 팔레트 (라이트/다크 양쪽에서 식별 가능).
const PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

const W = 720;
const H = 280;
const PAD = { top: 12, right: 16, bottom: 28, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function xAt(i: number, n: number): number {
  if (n <= 1) return PAD.left + PLOT_W / 2;
  return PAD.left + (i / (n - 1)) * PLOT_W;
}

function yAt(sov: number): number {
  return PAD.top + (1 - sov) * PLOT_H;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export interface SovTimelineProps {
  points: HistoryPoint[];
  brandNames: Map<string, string>;
  selfBrandId: string;
  /** 데이터 부족 시 안내 문구. */
  needMoreLabel: string;
}

export function SovTimeline({
  points,
  brandNames,
  selfBrandId,
  needMoreLabel,
}: SovTimelineProps) {
  const n = points.length;

  // 어떤 시점에라도 등장한 브랜드 = 라인 대상. 최신 SoV 내림차순으로 안정 정렬.
  const brandIds = Array.from(
    new Set(points.flatMap((p) => Object.keys(p.shareOfVoice))),
  ).sort((a, b) => {
    const last = points[n - 1]?.shareOfVoice ?? {};
    return (last[b] ?? 0) - (last[a] ?? 0);
  });

  const colorOf = new Map<string, string>();
  brandIds.forEach((id, i) => colorOf.set(id, PALETTE[i % PALETTE.length]));

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // x축 라벨: 최대 6개까지 균등 표시.
  const labelStep = n <= 6 ? 1 : Math.ceil(n / 6);

  return (
    <div>
      {/* 범례 */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {brandIds.map((id) => {
          const isSelf = id === selfBrandId;
          return (
            <span key={id} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorOf.get(id) }}
              />
              <span className={isSelf ? "font-semibold" : ""}>
                {brandNames.get(id) ?? id}
              </span>
            </span>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Share of Voice timeline"
      >
        {/* Y 그리드 + % 라벨 */}
        {yTicks.map((t) => {
          const y = yAt(t);
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                opacity={0.5}
              >
                {Math.round(t * 100)}%
              </text>
            </g>
          );
        })}

        {/* X 라벨 (날짜) */}
        {points.map((p, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={`xl-${i}`}
              x={xAt(i, n)}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              opacity={0.5}
            >
              {shortDate(p.runAt)}
            </text>
          ) : null,
        )}

        {/* 브랜드별 라인 + 점 */}
        {brandIds.map((id) => {
          const isSelf = id === selfBrandId;
          const color = colorOf.get(id)!;
          const path = points
            .map((p, i) => {
              const x = xAt(i, n);
              const y = yAt(p.shareOfVoice[id] ?? 0);
              return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <g key={id}>
              {n >= 2 && (
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelf ? 3 : 1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={isSelf ? 1 : 0.85}
                />
              )}
              {points.map((p, i) => (
                <circle
                  key={`${id}-${i}`}
                  cx={xAt(i, n)}
                  cy={yAt(p.shareOfVoice[id] ?? 0)}
                  r={isSelf ? 3.5 : 2.5}
                  fill={color}
                >
                  <title>
                    {(brandNames.get(id) ?? id)}: {Math.round((p.shareOfVoice[id] ?? 0) * 100)}% ·{" "}
                    {shortDate(p.runAt)}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {n < 2 && (
        <p className="mt-2 text-center text-xs opacity-60">{needMoreLabel}</p>
      )}
    </div>
  );
}
