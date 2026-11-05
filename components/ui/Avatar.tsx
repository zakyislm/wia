/* eslint-disable @next/next/no-img-element -- Local session-only photo preview. */
export function Avatar({ name, src }: { name: string; src?: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {src ? <img src={src} alt="" /> : name.charAt(0)}
    </span>
  );
}
