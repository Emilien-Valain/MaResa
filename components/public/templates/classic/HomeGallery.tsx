import Image from "next/image";
import type { GalleryPhoto } from "@/lib/tenant-context";

type TileProps = {
  photo: GalleryPhoto;
  ratio: string;
  sizes: string;
  priority?: boolean;
};

function Tile({ photo, ratio, sizes, priority }: TileProps) {
  return (
    <figure
      className="relative overflow-hidden group rounded-sm"
      style={{
        aspectRatio: ratio,
        borderColor: "color-mix(in oklch, var(--color-primary) 12%, transparent)",
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <Image
        src={photo.url}
        alt={photo.caption ?? ""}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
      />
      {photo.caption && (
        <figcaption
          className="absolute bottom-3 left-3 px-2.5 py-1 rounded-sm text-[11.5px] font-semibold tracking-wide backdrop-blur-sm"
          style={{
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
          }}
        >
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}

export default function ClassicHomeGallery({
  photos,
}: {
  photos: GalleryPhoto[];
}) {
  if (!photos || photos.length === 0) return null;

  const count = Math.min(photos.length, 6);
  const items = photos.slice(0, count);

  // Default sizes — overridden per slot when useful.
  const fullSizes = "(max-width: 768px) 100vw, 1100px";
  const halfSizes = "(max-width: 768px) 100vw, 550px";
  const thirdSizes = "(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 360px";
  const quarterSizes = "(max-width: 768px) 50vw, 280px";

  let layout: React.ReactNode = null;

  // 1 photo — single wide hero
  if (count === 1) {
    layout = (
      <Tile photo={items[0]} ratio="21/9" sizes={fullSizes} priority />
    );
  }

  // 2 photos — side by side
  else if (count === 2) {
    layout = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {items.map((p) => (
          <Tile key={p.id} photo={p} ratio="4/3" sizes={halfSizes} />
        ))}
      </div>
    );
  }

  // 3 photos — 1 large portrait + 2 stacked
  else if (count === 3) {
    layout = (
      <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3.5">
        <Tile photo={items[0]} ratio="4/5" sizes={halfSizes} />
        <div className="grid grid-rows-2 gap-3.5">
          <Tile photo={items[1]} ratio="4/3" sizes={halfSizes} />
          <Tile photo={items[2]} ratio="4/3" sizes={halfSizes} />
        </div>
      </div>
    );
  }

  // 4 photos — 2×2 grid
  else if (count === 4) {
    layout = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {items.map((p) => (
          <Tile key={p.id} photo={p} ratio="4/3" sizes={halfSizes} />
        ))}
      </div>
    );
  }

  // 5 photos — 1 wide on top + 4 squares below
  else if (count === 5) {
    layout = (
      <div className="flex flex-col gap-3.5">
        <Tile photo={items[0]} ratio="21/9" sizes={fullSizes} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {items.slice(1).map((p) => (
            <Tile key={p.id} photo={p} ratio="1/1" sizes={quarterSizes} />
          ))}
        </div>
      </div>
    );
  }

  // 6 photos — 3×2 grid
  else {
    layout = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {items.map((p) => (
          <Tile key={p.id} photo={p} ratio="4/3" sizes={thirdSizes} />
        ))}
      </div>
    );
  }

  return (
    <section
      className="px-6 py-20"
      style={{ background: "var(--classic-cream)" }}
      data-testid="home-gallery"
      data-count={count}
    >
      <div className="max-w-5xl mx-auto animate-fade-up">{layout}</div>
    </section>
  );
}
