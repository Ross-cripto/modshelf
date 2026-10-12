import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModDemoHref } from "../lib/mod-demos.ts";

test("every published mod has its own terminal demo route", () => {
  const catalog = JSON.parse(readFileSync(new URL("../catalog/mods.json", import.meta.url), "utf8")) as { id: string }[];
  for (const mod of catalog) {
    assert.equal(getModDemoHref(mod.id), `/mods/${mod.id}/demo`, mod.id);
  }
});

test("unknown mod ids do not produce unverified demo links", () => {
  assert.equal(getModDemoHref("not-a-mod"), null);
  assert.equal(getModDemoHref("../../elsewhere"), null);
});
