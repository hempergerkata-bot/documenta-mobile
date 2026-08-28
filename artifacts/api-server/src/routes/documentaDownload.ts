import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const apkFileName = "documenta-android-development-ocr.apk";
const apkPath = path.resolve(
  process.cwd(),
  "../../.agents/outputs/documenta-android-development-ocr.apk",
);

router.get("/install/documenta", (_request, response) => {
  response
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="hu">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Documenta Android telepítés</title>
    <style>
      body { margin: 0; background: #f8f7f3; color: #20201d; font-family: system-ui, sans-serif; }
      main { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
      a { display: block; margin-top: 28px; padding: 16px 20px; border-radius: 12px; background: #20201d; color: white; font-weight: 700; text-align: center; text-decoration: none; }
      p { line-height: 1.55; }
      small { color: #65645f; }
    </style>
  </head>
  <body>
    <main>
      <h1>Documenta Android Development Build</h1>
      <p>A csomag tartalmazza az offline ML Kit OCR-t, a natív dokumentumszkennert és a javított PDF-képoptimalizálást.</p>
      <a href="../downloads/${apkFileName}">APK letöltése</a>
      <p><small>Méret: 292,31 MB. Build: 5507406e-d319-4db7-adc7-f2416d5f8fa5</small></p>
    </main>
  </body>
</html>`);
});

router.get(
  `/downloads/${apkFileName}`,
  async (request, response, next) => {
    try {
      const fileStat = await stat(apkPath);
      const range = request.headers.range;

      response.set({
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600, no-transform",
        "Content-Disposition": `attachment; filename="${apkFileName}"`,
        "Content-Type": "application/vnd.android.package-archive",
        "X-Content-Type-Options": "nosniff",
      });

      if (!range) {
        response.set("Content-Length", String(fileStat.size));
        createReadStream(apkPath).pipe(response);
        return;
      }

      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) {
        response.status(416).set("Content-Range", `bytes */${fileStat.size}`).end();
        return;
      }

      const start = Number(match[1]);
      const requestedEnd = match[2] ? Number(match[2]) : fileStat.size - 1;
      const end = Math.min(requestedEnd, fileStat.size - 1);

      if (start > end || start >= fileStat.size) {
        response.status(416).set("Content-Range", `bytes */${fileStat.size}`).end();
        return;
      }

      response
        .status(206)
        .set({
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
        });
      createReadStream(apkPath, { start, end }).pipe(response);
    } catch (error) {
      next(error);
    }
  },
);

export default router;