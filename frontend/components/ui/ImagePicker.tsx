'use client';

import { ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export function ImagePicker({
  files,
  onChange,
  max = 4,
  label = 'Add photos',
  inputId,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  label?: string;
  inputId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    let problem: string | null = null;
    for (const f of Array.from(list)) {
      if (!ACCEPTED.includes(f.type)) problem = `${f.name}: only JPEG, PNG or WebP are allowed`;
      else if (f.size > MAX_BYTES) problem = `${f.name}: larger than 5 MB`;
      else if (next.length >= max) problem = `You can attach up to ${max} photos`;
      else next.push(f);
    }
    setError(problem);
    onChange(next);
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-forest ring-1 ring-inset ring-line hover:bg-pale"
      >
        <ImagePlus className="h-4 w-4 text-turquoise" aria-hidden /> {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {previews.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <li key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Selected photo ${i + 1}`} className="h-16 w-16 rounded-lg border border-line object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-forest p-0.5 text-white"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
