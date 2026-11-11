import "dotenv/config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, bucketName, publicDomain } from "../lib/r2";

const ASSETS: Array<{ key: string; sourceUrl: string }> = [
  // 1. Profile Pictures (pfp/)
  {
    key: "pfp/alya.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop",
  },
  {
    key: "pfp/nadia.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=240&auto=format&fit=crop",
  },
  {
    key: "pfp/zaki.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop",
  },
  {
    key: "pfp/adrian.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=240&auto=format&fit=crop",
  },
  {
    key: "pfp/farika.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop",
  },

  // 2. Post Photos (posts/) — 18 Reports + 2 General Posts
  {
    key: "posts/trotoar-merdeka.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/contoh-success.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/contoh-failed.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/antrean-tamansari.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-jalan-lampung.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-banjir-demak.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-sampah-sarimukti.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-karhutla-kaltara.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-rob-semarang.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1485617359743-4dc5d2e53c89?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-macet-bundaran-hi.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-kabel-transmisi-kaltim.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-sampah-pesisir-muaraangke.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-limbah-citarum.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1621451537084-482c73073a0f?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-sekolah-garut.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-galian-drainase-surabaya.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-rel-komuter-manggarai.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-pdam-bandung-timur.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1538300342682-cf57afb97285?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/rep-pasar-gembrong-jakartatimur.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "posts/kopi-braga.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=720&auto=format&fit=crop",
  },
  {
    key: "posts/ruang-hijau.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=720&auto=format&fit=crop",
  },

  // 3. Resolution Evidence Photos (evidence/)
  {
    key: "evidence/res-road-repair.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "evidence/res-paving-done.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "evidence/res-recycling.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "evidence/res-health-post.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "evidence/res-traffic-order.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1517732306149-e8f829eb588a?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "evidence/res-coastal-clean.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "evidence/res-rail-signal.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?q=80&w=1080&auto=format&fit=crop",
  },
  {
    key: "evidence/res-water-pipe.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1538300342682-cf57afb97285?q=80&w=1080&auto=format&fit=crop",
  },
];

async function syncR2Assets() {
  console.log(`=== SYNCING ASSETS TO CLOUDFLARE R2 BUCKET '${bucketName}' (${publicDomain}) ===`);

  // 1. Upload robots.txt to root of R2 bucket (https://s3.kavi.jeki.me/robots.txt)
  const robotsTxt = [
    "User-agent: *",
    "Allow: /pfp/",
    "Allow: /posts/",
    "Allow: /evidence/",
    "",
    "Sitemap: https://app.kavi.jeki.me/sitemap.xml",
    "",
  ].join("\n");

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: "robots.txt",
      Body: Buffer.from(robotsTxt, "utf-8"),
      ContentType: "text/plain; charset=utf-8",
    })
  );
  console.log(`✓ Uploaded ${publicDomain}/robots.txt`);

  // 2. Download unique source images into memory cache
  const uniqueUrls = Array.from(new Set(ASSETS.map((a) => a.sourceUrl)));
  const bufferCache = new Map<string, { buffer: Buffer; contentType: string }>();

  await Promise.all(
    uniqueUrls.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status}`);
      }
      const arr = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      bufferCache.set(url, { buffer: Buffer.from(arr), contentType });
    })
  );
  console.log(`✓ Downloaded ${bufferCache.size} unique source images`);

  // 3. Upload all assets to R2 under pfp/, posts/, and evidence/
  for (const item of ASSETS) {
    const cached = bufferCache.get(item.sourceUrl)!;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: item.key,
        Body: cached.buffer,
        ContentType: cached.contentType,
      })
    );
    console.log(`✓ Uploaded ${publicDomain}/${item.key} (${(cached.buffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log("=== ALL R2 BUCKET FOLDERS (pfp/, posts/, evidence/, robots.txt) SYNCED ===");
}

syncR2Assets().catch((err) => {
  console.error("Failed to sync R2 assets:", err);
  process.exit(1);
});
