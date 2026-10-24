"use client";
import { useTransition } from "react";
import { setFlagsAction } from "@/app/actions";

export default function CabinetToggles({ isAvailable, hidden, canHide }: { isAvailable: boolean; hidden: boolean; canHide: boolean }) {
  const [pending, start] = useTransition();
  return (
    <section className="box">
      <h3>Holat</h3>
      <label className="switch" htmlFor="t-avail">
        <div><b>Hozir bandman</b><span className="muted small">Kartochkada “Band” yoziladi, profil katalogda qoladi.</span></div>
        <input type="checkbox" role="switch" id="t-avail" checked={!isAvailable} disabled={pending}
          onChange={(e) => start(async () => { await setFlagsAction({ isAvailable: !e.target.checked }); })} />
      </label>
      {canHide && (
        <label className="switch" htmlFor="t-hide">
          <div><b>Profilni katalogdan yashirish</b><span className="muted small">Ta’til yoki tanaffus uchun. Qayta yoqsangiz, tekshiruvsiz qaytadi.</span></div>
          <input type="checkbox" role="switch" id="t-hide" checked={hidden} disabled={pending}
            onChange={(e) => start(async () => { await setFlagsAction({ hidden: e.target.checked }); })} />
        </label>
      )}
    </section>
  );
}
