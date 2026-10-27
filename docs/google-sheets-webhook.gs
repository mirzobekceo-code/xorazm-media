/**
 * Xorazm Digital HUB → Google Sheets (lidlar hisoboti).
 *
 * O'rnatish:
 * 1. Google Sheets'da yangi jadval oching → Kengaytmalar (Extensions) → Apps Script.
 * 2. Shu faylni to'liq nusxalab qo'ying va SECRET qiymatini o'zingiz o'ylab topgan uzun so'zga almashtiring.
 * 3. Deploy → New deployment → turi "Web app": Execute as — Me, Who has access — Anyone → Deploy.
 * 4. Berilgan "Web app URL"ni Vercel'da GOOGLE_SHEETS_WEBHOOK_URL ga, SECRET'ni GOOGLE_SHEETS_SECRET ga qo'shing.
 *
 * Varaqlar: "Haftalik" — har shanba 20:00 dagi hisobot; "Buyurtmalar" — portfolio sahifasidan kelgan buyurtmalar (darhol).
 */
const SECRET = "BU_YERGA_MAXFIY_SOZ";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.secret !== SECRET) return out({ ok: false, error: "secret" });
  const name = data.sheet === "order" ? "Buyurtmalar" : "Haftalik";
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName(name) || book.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(data.header);
    sheet.getRange(1, 1, 1, data.header.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  if (data.sheet !== "order" && data.rows.length) {
    // Haftalik hisobotlar orasida sarlavha qatori — qaysi hafta ekanini ko'rish oson bo'lsin
    sheet.appendRow(["— Hafta: " + Utilities.formatDate(new Date(), "Asia/Tashkent", "yyyy-MM-dd") + " —"]);
  }
  if (data.rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, data.rows.length, data.rows[0].length).setValues(data.rows);
  return out({ ok: true, added: data.rows.length });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
