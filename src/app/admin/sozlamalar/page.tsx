import { requireStaff } from "@/lib/auth";
import { botEnabled, tg } from "@/lib/telegram";
import { SITE } from "@/lib/site";
import { uploadLimits } from "@/lib/limits";
import { setupTelegramBot } from "../actions";

type WebhookInfo = { url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number };

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireStaff("admin");
  const { ok } = await searchParams;
  const [me, hook] = botEnabled()
    ? await Promise.all([tg<{ username: string; first_name: string }>("getMe"), tg<WebhookInfo>("getWebhookInfo")])
    : [null, null];
  const expected = `${SITE.url}/api/telegram/webhook`;
  const L = uploadLimits();
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Sozlamalar</h1>
      <div className="box">
        <h3>Telegram bot</h3>
        {!botEnabled() ? (
          <p className="muted">Bot ulanmagan. @BotFather’da bot yarating va tokenni hostingda <code>TELEGRAM_BOT_TOKEN</code> nomi bilan kiriting.</p>
        ) : !me ? (
          <p className="err">Token noto‘g‘ri yoki Telegram javob bermadi.</p>
        ) : (
          <>
            <dl className="spec">
              <dt>Bot</dt><dd><a className="link" href={`https://t.me/${me.username}`} target="_blank" rel="noopener">@{me.username}</a> ({me.first_name})</dd>
              <dt>Webhook</dt><dd>{hook?.url === expected ? "✓ O‘rnatilgan" : hook?.url ? `Boshqa manzil: ${hook.url}` : "O‘rnatilmagan"}</dd>
              {hook?.last_error_message && [<dt key="e">Oxirgi xato</dt>, <dd key="d" className="err">{hook.last_error_message}</dd>]}
              <dt>Navbatdagi xabarlar</dt><dd className="num">{hook?.pending_update_count ?? 0}</dd>
            </dl>
            {ok && <p className="ok">✓ Webhook, buyruqlar va menyu tugmasi o‘rnatildi.</p>}
            <form action={setupTelegramBot}><button className="btn">{hook?.url === expected ? "Qayta o‘rnatish" : "Botni sozlash"}</button></form>
            <p className="muted small">Webhook: {expected}. Sayt manzili o‘zgarsa (masalan, domen ulanganda) shu tugmani qayta bosing.</p>
          </>
        )}
      </div>
      <div className="box">
        <h3>Yuklash limitlari</h3>
        <dl className="spec">
          <dt>Rasm / profil</dt><dd className="num">{L.images}</dd>
          <dt>Video fayl / profil</dt><dd>{L.videos ? `${L.videos} ta, ${L.videoSeconds} s, ${L.videoMb} MB gacha` : "O‘chirilgan (faqat havola)"}</dd>
          <dt>Bloger skrinshotlari</dt><dd className="num">{L.screenshots}</dd>
        </dl>
        <p className="muted small">Hostingdagi MAX_IMAGES, MAX_VIDEOS, MAX_VIDEO_MB, MAX_VIDEO_SECONDS o‘zgaruvchilari bilan o‘zgartiriladi.</p>
      </div>
    </>
  );
}
