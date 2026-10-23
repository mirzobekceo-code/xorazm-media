"use client";
import { useRef, useState } from "react";
import { REPORT_REASONS } from "@/lib/reference";

export default function ReportButton({ profileId }: { profileId: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  return (
    <>
      <button className="link small muted" style={{ alignSelf: "flex-start" }} onClick={() => { setState("idle"); ref.current?.showModal(); }}>Shikoyat qilish</button>
      <dialog ref={ref} aria-labelledby="rep-h">
        {state === "sent" ? (
          <div className="stack">
            <h3 id="rep-h">Shikoyat qabul qilindi</h3>
            <p className="muted">Moderator 24 soat ichida ko‘rib chiqadi. Shikoyatingiz anonim.</p>
            <button className="btn" onClick={() => ref.current?.close()}>Yopish</button>
          </div>
        ) : (
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            setState("sending");
            const f = new FormData(e.currentTarget);
            const res = await fetch("/api/v1/reports", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ profileId, reason: f.get("reason"), text: f.get("text"), website: f.get("website") }),
            }).catch(() => null);
            setState(res?.ok ? "sent" : "error");
          }}>
            <h3 id="rep-h">Profil ustidan shikoyat</h3>
            <div className="field"><label htmlFor="rep-reason">Sabab</label>
              <select className="inp" id="rep-reason" name="reason" required>{REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="rep-text">Izoh</label><textarea className="inp" id="rep-text" name="text" rows={3} maxLength={1000} /></div>
            <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
            {state === "error" && <p className="err">Yuborilmadi. Birozdan keyin qayta urinib ko‘ring.</p>}
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn ghost" onClick={() => ref.current?.close()}>Bekor qilish</button>
              <button className="btn" disabled={state === "sending"}>Yuborish</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
