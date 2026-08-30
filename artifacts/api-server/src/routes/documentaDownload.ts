import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter, type RequestHandler } from "express";

const router: IRouter = Router();

const apkFileName = "documenta-samsung-arm64-1.0.0.apk";
const apkSize = 107486490;
const apkSha256 = "9cf0bd10a4520bf6895fe1706eab71905bc23b2d7aac0a1da749e40e4f42901c";
const buildId = "a1558c57-6a27-460d-ba3d-2f69c124e1cf";
const sourceSha = "0c2c07839b4d1a20a15853eb613c6b20fda1d6ce";
const maxTokenLifetimeMs = 14 * 24 * 60 * 60 * 1000;
const apkPath = path.resolve(
  process.cwd(),
  "../../downloads/Documenta-Samsung-ARM64.apk",
);

function signingSecret() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function expectedSignature(expiresAt: string) {
  return createHmac("sha256", signingSecret())
    .update(`documenta-apk:${buildId}:${expiresAt}`)
    .digest("hex");
}

function validToken(token: string) {
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra || !/^\d{13}$/.test(expiresAt) || !/^[a-f0-9]{64}$/.test(signature)) {
    return false;
  }
  const expiry = Number(expiresAt);
  const now = Date.now();
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry - now > maxTokenLifetimeMs) {
    return false;
  }
  const expected = Buffer.from(expectedSignature(expiresAt), "hex");
  const provided = Buffer.from(signature, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

const requireSignedAccess: RequestHandler = (request, response, next) => {
  const token = typeof request.query["token"] === "string" ? request.query["token"] : "";
  if (!validToken(token)) {
    response
      .status(401)
      .set({
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      })
      .type("text")
      .send("Érvénytelen vagy lejárt belső letöltési hivatkozás.");
    return;
  }
  response.locals["documentaDownloadToken"] = token;
  next();
};

let verifiedFileKey = "";

async function verifyApkArtifact() {
  const fileStat = await stat(apkPath);
  const fileKey = `${fileStat.size}:${fileStat.mtimeMs}`;
  if (verifiedFileKey === fileKey) return fileStat;
  if (fileStat.size !== apkSize) {
    throw new Error("A belső APK mérete nem egyezik a rögzített artifacttal.");
  }
  const actualSha256 = await new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(apkPath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
  if (actualSha256 !== apkSha256) {
    throw new Error("A belső APK SHA-256 értéke nem egyezik a rögzített artifacttal.");
  }
  verifiedFileKey = fileKey;
  return fileStat;
}

router.get("/install/documenta", requireSignedAccess, (_request, response) => {
  const token = response.locals["documentaDownloadToken"] as string;
  response
    .status(200)
    .set({
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    })
    .type("html")
    .send(`<!doctype html>
<html lang="hu">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
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
      <h1>Documenta Android APK</h1>
      <p>Standalone belső preview build a jelenlegi main forrásból, beépített JavaScript bundle-lel. Metro, localhost és QR-kód nélkül indul.</p>
       <a href="../downloads/${apkFileName}?token=${encodeURIComponent(token)}">APK letöltése</a>
       <p><small>Méret: ${(apkSize / 1024 / 1024).toFixed(1)} MB. Build: ${buildId}</small></p>
       <p><small>Forrás commit: ${sourceSha}</small></p>
       <p><small>SHA-256: ${apkSha256}</small></p>
    </main>
  </body>
</html>`);
});

router.get(
  `/downloads/${apkFileName}`,
  requireSignedAccess,
  async (request, response, next) => {
    try {
       const fileStat = await verifyApkArtifact();
      const range = request.headers.range;

      response.set({
        "Accept-Ranges": "bytes",
         "Cache-Control": "private, no-store, no-transform",
        "Content-Disposition": `attachment; filename="${apkFileName}"`,
        "Content-Type": "application/vnd.android.package-archive",
         "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
         "X-Robots-Tag": "noindex, nofollow, noarchive",
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