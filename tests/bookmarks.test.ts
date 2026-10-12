import test from "node:test";
import assert from "node:assert/strict";
import { parseBookmarks, getServerBookmarkSnapshot } from "../lib/bookmarks.ts";

test("stored bookmarks handle malformed and older browser data", () => {
  assert.deepEqual(parseBookmarks(null), []);
  assert.deepEqual(parseBookmarks("not json"), []);
  assert.deepEqual(parseBookmarks('{"id":"cc-arcade"}'), []);
  assert.deepEqual(parseBookmarks('["cc-arcade",false,22,"cctop"]'), ["cc-arcade", "cctop"]);
});

test("server bookmark snapshot is stable and contains no visitor preferences", () => {
  const initialSnapshot = getServerBookmarkSnapshot();
  assert.deepEqual(initialSnapshot, []);
  assert.equal(getServerBookmarkSnapshot(), initialSnapshot);
});
