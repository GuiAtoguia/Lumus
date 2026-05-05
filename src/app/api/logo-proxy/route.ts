import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  const cleaned = domain.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; Lumus-Branddi/1.0)",
    "Accept": "image/png,image/jpeg,image/webp,image/*",
  };

  // 1. Clearbit (melhor qualidade)
  try {
    const res = await fetch(`https://logo.clearbit.com/${cleaned}`, { headers });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "image/png";
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength >= 200) {
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=604800",
          },
        });
      }
    }
  } catch { /* continua */ }

  // 2. Favicon via Google (256px)
  try {
    const res = await fetch(
      `https://www.google.com/s2/favicons?domain=${cleaned}&sz=256`,
      { headers }
    );
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength >= 100) {
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=604800",
          },
        });
      }
    }
  } catch { /* continua */ }

  // 3. favicon.ico do próprio site
  try {
    const res = await fetch(`https://${cleaned}/favicon.ico`, {
      headers,
      redirect: "follow",
    });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength >= 100) {
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/x-icon",
            "Cache-Control": "public, max-age=604800",
          },
        });
      }
    }
  } catch { /* sem logo */ }

  return NextResponse.json({ error: "Logo não encontrada para: " + cleaned }, { status: 404 });
}
