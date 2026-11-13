import { galleryTiles, type Content } from "../lib/content";

/** GalleryRestaurant01: from five tiles up every fifth tile is double wide. Without permission to use the owner's pictures each tile is a labelled colour block. */
export function Gallery({ c }: { c: Content }) {
  const tiles = galleryTiles(c);
  return (
    <section className="rb-sec alt" id="gallery">
      <div className="rb-container">
        <h2 className="rb-title">Our Food</h2>
        <div className="rb-gallery">
          {tiles.map(({ img: g, large, placeholder }, n) => (
            <figure className={large ? "rb-tile large" : "rb-tile"} key={`${g.src}-${n}`}>
              {c.usePhotos && !placeholder ? <img src={g.src} alt={g.alt} loading="lazy" /> : <div className="ph" role="img" aria-label={g.alt}>{g.alt}</div>}
              {c.usePhotos && !placeholder && g.alt.trim() ? <figcaption className="cap">{g.alt}</figcaption> : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
