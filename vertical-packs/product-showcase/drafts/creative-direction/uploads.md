# Owner uploads: illustrations, screenshots and logos

DRAFT. Needs three parts that do not exist yet: attaching a file in Scout's chat, a place to keep the file until the build, and the worker copying it into the site. Nothing here is wired in.

## What the owner can add

A hero illustration, product screenshots, a logo, a favicon. Added by attaching a file in the chat or on the review screen ("Add your own art"). Also after the site is live, by asking Scout to swap one in.

## Rules

- Types: PNG, JPG, WebP, SVG. At most 3 MB per file, 8 files per site.
- Alt text is required. Scout drafts one from what it sees and the owner can edit it.
- The owner confirms they have the right to use the file. One line on the review: "I have the right to use these images."
- EXIF data is removed. Image width and height are recorded.
- **SVG is cleaned before use:** remove script elements, event attributes (`onload`, `onclick` and the like), `foreignObject`, and any reference to an external address. A file that cannot be cleaned is refused with a plain message.
- Files are never executed or run through a build step; they are static assets.
- The site uses a file exactly as given: no recolouring, redrawing, cropping beyond the frame, or stretching. It chooses `contain` or `cover` by the file's shape and keeps the 16:10 hero slot.
- A file that fails to load, or is missing, falls back to the placeholder box with its label. The site never shows a broken image.

## Where the files live

1. **Before the build:** a `site_assets` table in the builder's database (project id, file name, type, size, width, height, alt text, bytes). Files are small, so the database is enough for the first version and needs no new service. (A blob store can replace it later without changing anything else.)
2. **At build time:** the worker writes each file into the run's `app/public/art/` with a content-hash name, and the brief's `imagery` block maps a slot (`hero`, `logo`, `favicon`, `screenshot-1`) to the file.
3. **After the site is live:** an upload goes through the same change flow as any other change: Scout shows a preview with the image in place, and publishes on approval. Removing the change removes the file.

## Checks

1. Every slot in `imagery` points to a file that exists in `public/art/`.
2. Every image has non-empty alt text.
3. An image's rendered aspect ratio matches its natural ratio within 2%, or it sits inside a frame with `contain`.
4. No SVG in `public/art/` contains `<script`, `foreignObject`, `on...=` attributes, or an external URL.
5. With the file removed, the page shows the placeholder and no broken-image icon.
