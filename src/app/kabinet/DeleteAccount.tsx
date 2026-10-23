"use client";
import { useState } from "react";

export default function DeleteAccount({ action }: { action: () => Promise<void> }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className="link small" style={{ color: "var(--bad)" }} onClick={() => setAsk(true)}>Profil va akkauntni o‘chirish</button>;
  return (
    <form action={action} className="row">
      <span className="small">Profil, rasmlar va statistika butunlay o‘chadi.</span>
      <button type="button" className="btn ghost sm" onClick={() => setAsk(false)}>Bekor qilish</button>
      <button className="btn danger sm">Ha, o‘chirish</button>
    </form>
  );
}
