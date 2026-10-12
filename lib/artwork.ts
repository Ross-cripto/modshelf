const ARTWORK = {
  community: {
    url: "/art/community-desk.webp",
    sourcePlate: "assets/plates/hero-art.png",
  },
  "arcade-art": {
    url: "/art/arcade-art.webp",
    sourcePlate: "assets/plates/arcade-art.png",
  },
  "dashboard-art": {
    url: "/art/dashboard-art.webp",
    sourcePlate: "assets/plates/dashboard-art.png",
  },
  "workflow-art": {
    url: "/art/workflow-art.webp",
    sourcePlate: "assets/plates/workflow-art.png",
  },
  "mindful-art": {
    url: "/art/mindful-art.webp",
    sourcePlate: "assets/plates/mindful-art.png",
  },
  "context-art": {
    url: "/art/context-art.webp",
    sourcePlate: "assets/plates/context-art.png",
  },
  "dino-art": {
    url: "/art/dino-art.webp",
    sourcePlate: "assets/plates/dino-art.png",
  },
};
export function isLocalArtworkPath(value: string): boolean {
  return /^\/art\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|webp)$/.test(value);
}

function isKnownArtwork(name: string): name is keyof typeof ARTWORK {
  return Object.hasOwn(ARTWORK, name);
}

export function isArtworkReference(value: string): boolean {
  return isKnownArtwork(value) || isLocalArtworkPath(value);
}

export function artworkUrl(name: string): string {
  if (isLocalArtworkPath(name)) return name;
  if (isKnownArtwork(name)) return ARTWORK[name].url;
  return ARTWORK["context-art"].url;
}
