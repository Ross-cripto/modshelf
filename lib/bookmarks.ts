const BOOKMARKS_KEY = "modshelf:saved:v1";
const BOOKMARKS_EVENT = "modshelf:bookmarks-changed";
const EMPTY_BOOKMARKS: string[] = [];
let cachedStorageValue: string | null | undefined;
let currentBookmarks: string[] = EMPTY_BOOKMARKS;

export function parseBookmarks(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function getBookmarkSnapshot(): string[] {
  try {
    const storageValue = window.localStorage.getItem(BOOKMARKS_KEY);
    if (storageValue !== cachedStorageValue) {
      cachedStorageValue = storageValue;
      currentBookmarks = parseBookmarks(storageValue);
    }
  } catch {
    return currentBookmarks;
  }
  return currentBookmarks;
}

export function getServerBookmarkSnapshot(): string[] {
  return EMPTY_BOOKMARKS;
}

export function subscribeBookmarks(onChange: () => void): () => void {
  function onStorageChange(event: StorageEvent) {
    if (event.key === BOOKMARKS_KEY || event.key === null) onChange();
  }
  window.addEventListener("storage", onStorageChange);
  window.addEventListener(BOOKMARKS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorageChange);
    window.removeEventListener(BOOKMARKS_EVENT, onChange);
  };
}

export function writeBookmarks(bookmarks: string[]): boolean {
  currentBookmarks = bookmarks;
  let persisted = true;
  try {
    const storageValue = JSON.stringify(bookmarks);
    window.localStorage.setItem(BOOKMARKS_KEY, storageValue);
    cachedStorageValue = storageValue;
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new Event(BOOKMARKS_EVENT));
  return persisted;
}
