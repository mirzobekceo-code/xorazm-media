import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose" style={{ margin: "40px 0" }}>
      <h1>Sahifa topilmadi</h1>
      <p className="muted">Profil o‘chirilgan yoki manzil noto‘g‘ri bo‘lishi mumkin.</p>
      <p><Link className="btn" href="/mutaxassislar">Mutaxassislarga o‘tish</Link></p>
    </div>
  );
}
