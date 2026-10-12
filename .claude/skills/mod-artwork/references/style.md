# Modshelf artwork recipe

Inspect `public/art/arcade-art.webp`, `public/art/dashboard-art.webp`, and `public/art/workflow-art.webp` before generating. They are style references, not compositions to copy.

Use this base prompt, followed by the verified mod's name and one object metaphor for its real purpose:

> A standalone illustration for Modshelf, a community shelf of Claude Code mods. Match the supplied reference illustrations: hand-drawn charcoal ink, slightly irregular pen lines, delicate cross-hatching, generous empty space, muted dusty sage, terracotta, and cornflower accents, occasional warm cream paper notes. One coherent little desk-object vignette, friendly and thoughtfully composed, visible at small card sizes. A few legible handwritten words may show the exact mod name. Keep every object inside the frame with a 3 percent margin. Transparent background. Landscape 1536 by 1024 pixels. No website interface, card border, screenshot, glossy 3D, gradients, company logo, fake metrics, or unsupported claims. Do not copy another mod's illustrated objects. Mod: [verified name]. Purpose: [verified description]. Object metaphor: [specific concept].

Record the entire final prompt verbatim in `<asset>.json` with a UTC ISO `createdAt`. Optional `model` and reference paths help future contributors reproduce it. A text prompt alone does not count as completed artwork.

Review at card size: recognizable silhouette, light ink texture, sparse color, ample breathing room. Regenerate if clipped or stylistically inconsistent. One failed service request is enough to report a service limitation; do not hide errors with a stock image or an SVG substitute.
