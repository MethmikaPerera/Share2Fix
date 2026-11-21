/* eslint-disable @next/next/no-img-element */
export function EvidenceGallery({ urls, label = 'Photo' }: { urls: string[]; label?: string }) {
  if (urls.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2.5">
      {urls.map((u, i) => (
        <li key={u}>
          <a href={u} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label.toLowerCase()} ${i + 1} in a new tab`}>
            <img
              src={u}
              alt={`${label} ${i + 1}`}
              loading="lazy"
              className="h-24 w-24 rounded-md border border-line object-cover transition hover:border-ink-faint hover:opacity-90"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
