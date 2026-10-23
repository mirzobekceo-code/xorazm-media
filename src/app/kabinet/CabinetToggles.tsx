"use client";
import { useTransition } from "react";
import { setFlagsAction } from "@/app/actions";

export default function CabinetToggles({ isAvailable, hidden, canHide }: { isAvailable: boolean; hidden: boolean; canHide: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="box">
      <h3>Holat</h3>
      <div className="checks">
        <label><input type="checkbox" id="t-avail" checked={!isAvailable} disabled={pending}
          onChange={(e) => start(async () => { await setFlagsAction({ isAvailable: !e.target.checked }); })} /> Hozir bandman</label>
        {canHide && (
          <label><input type="checkbox" id="t-hide" checked={hidden} disabled={pending}
            onChange={(e) => start(async () => { await setFlagsAction({ hidden: e.target.checked }); })} /> Profilni katalogdan yashirish</label>
        )}
      </div>
    </div>
  );
}
