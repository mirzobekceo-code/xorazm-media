import { test } from "node:test";
import assert from "node:assert/strict";
import { embedFor } from "../src/lib/limits";

test("embedFor: sayt ichida ochiladigan havolalar", () => {
  assert.equal(embedFor("https://www.instagram.com/reel/DCra1SmNQUf/?igsh=NWJid204MzI5dHZn")?.src, "https://www.instagram.com/reel/DCra1SmNQUf/embed/");
  assert.equal(embedFor("https://instagram.com/reels/ABC_123/")?.src, "https://www.instagram.com/reel/ABC_123/embed/");
  assert.equal(embedFor("https://www.instagram.com/p/XYZ/")?.shape, "post");
  assert.equal(embedFor("https://t.me/Maksadbek_portolio/86")?.src, "https://t.me/Maksadbek_portolio/86?embed=1&mode=tme&single=1");
  assert.equal(embedFor("https://www.tiktok.com/@user.name/video/7106594312292453675?lang=uz")?.src, "https://www.tiktok.com/embed/v2/7106594312292453675");
  assert.equal(embedFor("https://youtu.be/dQw4w9WgXcQ")?.thumb, "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  assert.equal(embedFor("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.shape, "vertical");
  assert.equal(embedFor("https://vimeo.com/76979871")?.src, "https://player.vimeo.com/video/76979871?autoplay=1");
  assert.equal(embedFor("https://drive.google.com/file/d/1AbCdEfGhIjKlMn/view?usp=sharing")?.src, "https://drive.google.com/file/d/1AbCdEfGhIjKlMn/preview");
  assert.equal(embedFor("https://soundcloud.com/artist/track")?.shape, "audio");
});

test("embedFor: joylab bo'lmaydiganlar tashqi havola bo'lib qoladi", () => {
  for (const u of ["https://www.instagram.com/username/", "https://t.me/kanal", "https://vm.tiktok.com/ZMabc/", "https://drive.google.com/drive/folders/1abc", "http://youtu.be/x", "not a url"]) {
    assert.equal(embedFor(u), null, u);
  }
});
