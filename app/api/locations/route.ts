import { NextRequest, NextResponse } from "next/server";
import {
  filterLocalLocations,
  formatNominatimLocation,
} from "@/lib/regions";

interface NominatimResult {
  display_name?: string;
  address?: Record<string, string | undefined>;
}

const NOMINATIM_HEADERS = {
  "User-Agent": "KAVI-CivicPlatform/1.0",
  "Accept-Language": "id,en",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (lat && lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
      const res = await fetch(url, {
        headers: NOMINATIM_HEADERS,
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = (await res.json()) as NominatimResult;
        const formatted = formatNominatimLocation(
          json.address ?? {},
          json.display_name,
        );
        if (formatted) {
          return NextResponse.json({
            success: true,
            data: [formatted],
          });
        }
      }
    } catch {
      // Fall back gracefully when offline or timed out
    }
    return NextResponse.json({
      success: true,
      data: ["Bandung, Jawa Barat"],
    });
  }

  const localMatches = filterLocalLocations(q, 12);
  if (q.length < 3) {
    return NextResponse.json({ success: true, data: localMatches });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=id&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const list = (await res.json()) as NominatimResult[];
      const remoteFormatted = list
        .map((item) =>
          formatNominatimLocation(item.address ?? {}, item.display_name),
        )
        .filter(Boolean);
      const merged = Array.from(new Set([...localMatches, ...remoteFormatted])).slice(
        0,
        15,
      );
      return NextResponse.json({ success: true, data: merged });
    }
  } catch {
    // Serve local results silently when Nominatim is unreachable
  }

  return NextResponse.json({ success: true, data: localMatches });
}
