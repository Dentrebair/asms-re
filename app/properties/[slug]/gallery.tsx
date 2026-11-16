"use client";

import { useState } from "react";
import { Lightbox } from "@astryxdesign/core/Lightbox";
import { Button } from "@astryxdesign/core/Button";

type Photo = { src: string; srcSmall: string; alt: string };

/**
 * The property photos: up to three across the top (the first loads with high priority,
 * since it is the page's largest paint), and every photo opens in the Astryx Lightbox,
 * which pages, zooms and closes with Escape.
 */
export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const media = photos.map((p) => ({ src: p.src, alt: p.alt || title }));
  const show = (i: number) => { setIndex(i); setOpen(true); };
  const top = photos.slice(0, 3);

  return (
    <>
      <section className="gallery" data-count={top.length} aria-label="Property gallery">
        {top.map((p, i) => (
          <figure key={p.src}>
            <button type="button" className="gallery-open" onClick={() => show(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i === 0 ? p.src : p.srcSmall} alt={p.alt || title} {...(i === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const, decoding: "async" as const })} />
            </button>
          </figure>
        ))}
        {photos.length > 1 && (
          <span className="gallery-more">
            <Button label={`View all ${photos.length} photos`} variant="secondary" elevation="med" onClick={() => show(0)} />
          </span>
        )}
      </section>
      <Lightbox isOpen={open} onOpenChange={setOpen} media={media} index={index} onIndexChange={setIndex} hasZoom />
    </>
  );
}

/** Every photo as a thumbnail grid; each opens the Lightbox at that photo. */
export function PhotoGrid({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <button key={p.src} type="button" onClick={() => { setIndex(i); setOpen(true); }} aria-label={`Open photo ${i + 1}: ${p.alt || title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.srcSmall} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
      <Lightbox isOpen={open} onOpenChange={setOpen} media={photos.map((p) => ({ src: p.src, alt: p.alt || title }))} index={index} onIndexChange={setIndex} hasZoom />
    </>
  );
}
