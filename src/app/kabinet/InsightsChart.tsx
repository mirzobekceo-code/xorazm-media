"use client";
import { useState } from "react";

type Point = { day: string; views: number; contacts: number };

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const label = (day: string) => {
  const [, m, d] = day.split("-").map(Number);
  return `${d}-${MONTHS[m - 1]}`;
};

/** Ikki kichik grafik bir xil vaqt o'qida: ko'rishlar va kontakt bosishlar (har biri o'z shkalasida, bitta rang). */
export default function InsightsChart({ series }: { series: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const h = hover != null ? series[hover] : null;
  return (
    <div className="ichart" onMouseLeave={() => setHover(null)}>
      <div className="ichart-tip" aria-live="polite">
        {h
          ? <><b>{label(h.day)}</b> · {h.views} ko‘rish · {h.contacts} kontakt</>
          : <span className="muted">Kun ustiga olib boring yoki bosing</span>}
      </div>
      <Bars title="Ko‘rishlar" values={series.map((p) => p.views)} hover={hover} setHover={setHover} tone="views" />
      <Bars title="Kontakt bosishlar" values={series.map((p) => p.contacts)} hover={hover} setHover={setHover} tone="contacts" />
      <div className="ichart-x"><span>{label(series[0].day)}</span><span>bugun</span></div>
      <details className="small">
        <summary className="link">Jadval ko‘rinishi</summary>
        <table className="tbl ichart-tbl">
          <thead><tr><th>Kun</th><th>Ko‘rish</th><th>Kontakt</th></tr></thead>
          <tbody>{[...series].reverse().filter((p) => p.views || p.contacts).map((p) => (
            <tr key={p.day}><td>{label(p.day)}</td><td className="num">{p.views}</td><td className="num">{p.contacts}</td></tr>
          ))}</tbody>
        </table>
      </details>
    </div>
  );
}

function Bars({ title, values, hover, setHover, tone }: {
  title: string; values: number[]; hover: number | null; setHover: (i: number) => void; tone: "views" | "contacts";
}) {
  const max = Math.max(1, ...values);
  const W = 300, H = 64, n = values.length, slot = W / n, bw = Math.max(2, slot - 2);
  return (
    <figure className="ichart-row">
      <figcaption><span>{title}</span><b className="num">{values.reduce((a, v) => a + v, 0)}</b></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${title}, oxirgi ${n} kun`}>
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="base" />
        {values.map((v, i) => {
          const bh = v ? Math.max(3, (v / max) * (H - 6)) : 0;
          return (
            <g key={i}>
              {bh > 0 && <rect className={`bar ${tone}${hover === i ? " on" : ""}`} x={i * slot + 1} y={H - bh} width={bw} height={bh} rx="1.5" />}
              <rect className="hit" x={i * slot} y="0" width={slot} height={H} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
