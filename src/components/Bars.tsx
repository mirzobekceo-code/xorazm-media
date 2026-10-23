export default function Bars({ rows }: { rows: [string, number][] }) {
  return (
    <div className="bars">
      {rows.map(([label, v]) => (
        <div className="bar" key={label}>
          <span>{label}</span>
          <div className="track"><i style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></div>
          <b className="num">{v}%</b>
        </div>
      ))}
    </div>
  );
}
