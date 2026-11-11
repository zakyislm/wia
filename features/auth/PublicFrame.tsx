"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Globe, ArrowRight } from "lucide-react";
import { formatPageTitle } from "@/lib/title";

export function PublicFrame({
  title,
  documentTitle,
  children,
  wide = false,
}: {
  title: string;
  documentTitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const isSignup = pathname === "/signup";
  const resolvedDocTitle = formatPageTitle(documentTitle ?? title);

  useEffect(() => {
    document.title = resolvedDocTitle;
  }, [resolvedDocTitle]);

  return (
    <div className="public-surface">
      <header className="public-topnav">
        <div className="public-brand-block">
          <Link className="public-wordmark" href="/login" aria-label="Kavi">
            <Image
              src="/kavi.png"
              alt="Kavi"
              width={28}
              height={28}
              className="public-wordmark-img"
              preload
            />
            <span className="public-wordmark-text">Kavi</span>
          </Link>
          <span className="public-brand-rule" aria-hidden="true" />
          <Link className="public-brand-sublink" href="/help#about">
            <span>Tentang ruang warga</span>
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </div>

        <nav className="public-topnav-actions" aria-label="Navigasi publik">
          <Link
            href="/help#community"
            className="public-topnav-icon"
            aria-label="Pedoman komunitas"
            title="Pedoman komunitas"
          >
            <Globe size={18} strokeWidth={1.9} />
          </Link>
          <Link href="/help" className="public-topnav-link">
            Bantuan
          </Link>
          {isSignup ? (
            <Link href="/login" className="public-topnav-cta">
              Masuk
            </Link>
          ) : (
            <Link href="/signup" className="public-topnav-cta">
              Daftar
            </Link>
          )}
        </nav>
      </header>

      <main className="auth-page">
        <div className="auth-stage">
          {!wide && (
            <div className="auth-illustration" aria-hidden="true">
              {/* Left civic illustration elements */}
              <svg
                className="auth-illus-svg auth-illus-svg--left"
                viewBox="0 0 320 340"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Squiggle line */}
                <path
                  d="M28 74C52 74 58 46 76 46C94 46 84 82 104 82C124 82 132 54 154 54C172 54 178 68 198 68"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="176" cy="34" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="242" cy="186" r="5" stroke="currentColor" strokeWidth="1.5" />

                {/* Floating civic report card */}
                <rect
                  x="76"
                  y="112"
                  width="92"
                  height="62"
                  rx="6"
                  fill="var(--surface)"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="94"
                  y1="136"
                  x2="150"
                  y2="136"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="94"
                  y1="150"
                  x2="138"
                  y2="150"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Dotted brand accent pillar */}
                <rect
                  x="42"
                  y="206"
                  width="74"
                  height="124"
                  rx="4"
                  fill="var(--brand-tint)"
                />
                <circle cx="60" cy="226" r="4" fill="var(--brand)" />
                <circle cx="96" cy="232" r="4" fill="var(--brand)" />
                <circle cx="76" cy="252" r="4" fill="var(--brand)" />
                <circle cx="56" cy="276" r="4" fill="var(--brand)" />
                <circle cx="94" cy="272" r="4" fill="var(--brand)" />
                <circle cx="74" cy="298" r="4" fill="var(--brand)" />
                <circle cx="58" cy="316" r="4" fill="var(--brand)" />
                <circle cx="98" cy="312" r="4" fill="var(--brand)" />

                {/* Progress / resolution chart card */}
                <rect
                  x="128"
                  y="240"
                  width="78"
                  height="90"
                  rx="4"
                  fill="var(--surface)"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M150 308C158 292 168 274 176 256"
                  stroke="var(--brand)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M168 258L177 254L179 264"
                  stroke="var(--brand)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Right civic illustration elements */}
              <svg
                className="auth-illus-svg auth-illus-svg--right"
                viewBox="0 0 320 340"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M196 102C214 102 220 78 236 78C252 78 246 108 264 108C280 108 286 88 304 88"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="272" cy="54" r="3.5" stroke="currentColor" strokeWidth="1.5" />

                {/* Floating comment card */}
                <rect
                  x="28"
                  y="74"
                  width="72"
                  height="50"
                  rx="6"
                  fill="var(--surface)"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="44"
                  y1="94"
                  x2="84"
                  y2="94"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="44"
                  y1="106"
                  x2="74"
                  y2="106"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Citizen / contributor figure with laptop on pedestal */}
                <circle cx="144" cy="112" r="14" fill="var(--fg-primary)" />
                <path
                  d="M154 104C166 104 172 114 182 118C190 121 196 116 200 124C204 132 192 140 180 136C168 132 162 122 154 118"
                  fill="var(--fg-primary)"
                />
                {/* Torso */}
                <path
                  d="M126 134L168 134L178 192L118 192L126 134Z"
                  fill="var(--fg-primary)"
                />
                {/* Laptop in Kavi Blue */}
                <path
                  d="M72 152L94 192L134 192"
                  stroke="var(--brand)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Seated legs */}
                <path
                  d="M120 192L92 214L104 268L124 268L136 218L168 218"
                  fill="var(--surface)"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {/* Seat block */}
                <rect
                  x="136"
                  y="218"
                  width="58"
                  height="112"
                  rx="4"
                  fill="var(--surface)"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />

                {/* Dotted brand accent block right */}
                <rect
                  x="208"
                  y="224"
                  width="74"
                  height="106"
                  rx="4"
                  fill="var(--brand-tint)"
                />
                <circle cx="226" cy="244" r="4" fill="var(--brand)" />
                <circle cx="262" cy="248" r="4" fill="var(--brand)" />
                <circle cx="242" cy="268" r="4" fill="var(--brand)" />
                <circle cx="224" cy="292" r="4" fill="var(--brand)" />
                <circle cx="260" cy="288" r="4" fill="var(--brand)" />
                <circle cx="244" cy="312" r="4" fill="var(--brand)" />
              </svg>
              <div className="auth-illus-floor" />
            </div>
          )}

          <section className={`auth-card ${wide ? "auth-card-wide" : ""}`}>
            <h1>{title}</h1>
            {children}
          </section>
        </div>

        <footer className="public-bottom-bar">
          <span>Hak Cipta © Kavi 2026</span>
          <span className="public-bottom-sep" aria-hidden="true">
            |
          </span>
          <Link href="/help#privacy">Kebijakan Privasi</Link>
          <span className="public-bottom-sep" aria-hidden="true">
            |
          </span>
          <Link href="/help#terms">Ketentuan Layanan</Link>
        </footer>
      </main>
    </div>
  );
}
