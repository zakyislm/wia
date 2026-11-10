export const INDONESIA_PROVINCES = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Bengkulu",
  "Lampung",
  "DKI Jakarta",
  "Jawa Barat",
  "Banten",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Selatan",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Barat Daya",
];

/** Curated offline-first hierarchy list covering national, provincial, city/district, and landmarks. */
export const LOCAL_LOCATIONS: string[] = [
  "Indonesia",
  "Tamansari, Jakarta Barat, DKI Jakarta",
  "Pelabuhan Tanjung Priok, Jakarta Utara, DKI Jakarta",
  "Pasar Gembrong, Jatinegara, Jakarta Timur, DKI Jakarta",
  "Cilandak Barat, Cilandak, Jakarta Selatan, DKI Jakarta",
  "Gambir, Jakarta Pusat, DKI Jakarta",
  "Jakarta Barat, DKI Jakarta",
  "Jakarta Pusat, DKI Jakarta",
  "Jakarta Selatan, DKI Jakarta",
  "Jakarta Timur, DKI Jakarta",
  "Jakarta Utara, DKI Jakarta",
  "Sumur Bandung, Bandung, Jawa Barat",
  "Coblong, Bandung, Jawa Barat",
  "Cihampelas, Bandung, Jawa Barat",
  "Braga, Sumur Bandung, Bandung, Jawa Barat",
  "Bandung, Jawa Barat",
  "Bekasi, Jawa Barat",
  "Bogor, Jawa Barat",
  "Depok, Jawa Barat",
  "Tasikmalaya, Jawa Barat",
  "Cirebon, Jawa Barat",
  "Tangerang Selatan, Banten",
  "Serang, Banten",
  "Semarang Tengah, Semarang, Jawa Tengah",
  "Surakarta, Jawa Tengah",
  "Malioboro, Yogyakarta, DI Yogyakarta",
  "Sleman, DI Yogyakarta",
  "Gubeng, Surabaya, Jawa Timur",
  "Malang, Jawa Timur",
  "Kuta, Badung, Bali",
  "Denpasar, Bali",
  "Medan Barat, Medan, Sumatera Utara",
  "Padang, Sumatera Barat",
  "Pekanbaru, Riau",
  "Batam, Kepulauan Riau",
  "Palembang, Sumatera Selatan",
  "Bandar Lampung, Lampung",
  "Banda Aceh, Aceh",
  "Pontianak, Kalimantan Barat",
  "Banjarmasin, Kalimantan Selatan",
  "Samarinda, Kalimantan Timur",
  "Balikpapan, Kalimantan Timur",
  "Ibu Kota Nusantara, Penajam Paser Utara, Kalimantan Timur",
  "Tarakan Barat, Tarakan, Kalimantan Utara",
  "Tanjung Selor, Bulungan, Kalimantan Utara",
  "Makassar, Sulawesi Selatan",
  "Manado, Sulawesi Utara",
  "Kendari, Sulawesi Tenggara",
  "Ambon, Maluku",
  "Jayapura, Papua",
  ...INDONESIA_PROVINCES,
];

const ADMIN_PREFIX_RE =
  /^(?:provinsi|prov\.|kabupaten|kab\.|kota\s+administrasi|kota\s+adm\.|kota|kecamatan|kec\.|kelurahan|kel\.|desa)\s+/i;

/** Normalize a single administrative segment for hierarchy comparison. */
export function normalizeLocationSegment(segment: string): string {
  return segment
    .trim()
    .toLowerCase()
    .replace(ADMIN_PREFIX_RE, "")
    .replace(/\s+/g, " ");
}

/** Parse comma-delimited Indonesian location string into normalized segments. */
export function extractLocationSegments(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map(normalizeLocationSegment)
    .filter(Boolean);
}

/** Format OpenStreetMap / Nominatim addressdetails into a consistent civic hierarchy string. */
export function formatNominatimLocation(
  addr: Record<string, string | undefined>,
  displayName?: string,
): string {
  const parts: string[] = [];
  const spot =
    addr.amenity ||
    addr.tourism ||
    addr.leisure ||
    addr.shop ||
    addr.road ||
    addr.neighbourhood ||
    addr.hamlet;
  const village = addr.village || addr.suburb || addr.quarter;
  const district =
    addr.city_district || addr.subdistrict || addr.district || addr.municipality;
  const city = addr.city || addr.town || addr.county || addr.regency;
  const state = addr.state || addr.region;

  for (const candidate of [spot, village, district, city, state]) {
    const clean = candidate?.trim();
    if (clean && !parts.some((p) => normalizeLocationSegment(p) === normalizeLocationSegment(clean))) {
      parts.push(clean);
    }
  }
  if (parts.length > 0) return parts.join(", ");
  return displayName?.split(",").slice(0, 3).map((s) => s.trim()).join(", ") || "";
}

/** Filter local offline locations matching query (empty query returns all). */
export function filterLocalLocations(query: string, limit = 16): string[] {
  const clean = query.trim().toLowerCase();
  const unique = Array.from(new Set(LOCAL_LOCATIONS));
  if (!clean) return unique.slice(0, limit);
  return unique
    .filter((item) => item.toLowerCase().includes(clean))
    .slice(0, limit);
}

/**
 * Hierarchical jurisdiction check:
 * All segments of accountScope must exist inside the report's location hierarchy
 * (so Indonesia > Provinsi > Kota > Kecamatan all cover smaller areas inside them,
 * while equally-named districts in different cities stay isolated).
 */
export function matchesJurisdiction(
  reportLocation: string | undefined,
  reportProvince: string | undefined,
  accountScope: string | undefined,
): boolean {
  const scopeSegments = extractLocationSegments(accountScope);
  if (scopeSegments.length === 0) return false;
  if (scopeSegments.length === 1 && scopeSegments[0] === "indonesia") return true;

  const reportSegments = new Set([
    ...extractLocationSegments(reportLocation),
    ...extractLocationSegments(reportProvince),
    "indonesia",
  ]);
  return scopeSegments.every((seg) => reportSegments.has(seg));
}
