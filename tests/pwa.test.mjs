import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const manifest = JSON.parse(
  await readFile(new URL("../public/manifest.webmanifest", import.meta.url)),
);
const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function worker() {
  const events = {};
  const entries = new Map();
  const deleted = [];
  let online = true;
  let skipped = false;
  let claimed = false;
  vm.runInNewContext(source, {
    self: {
      location: { origin: "https://farm.example" },
      addEventListener: (name, cb) => {
        events[name] = cb;
      },
      skipWaiting: () => {
        skipped = true;
      },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
    },
    caches: {
      open: async () => ({
        addAll: async (urls) => {
          for (const url of urls) entries.set(url, new Response(url));
        },
      }),
      match: async (request) =>
        entries.get(typeof request === "string" ? request : new URL(request.url).pathname)?.clone(),
      keys: async () => ["flockbook-static-v0", "unrelated-cache", "flockbook-static-v1"],
      delete: async (key) => {
        deleted.push(key);
      },
    },
    fetch: async () => {
      if (!online) throw new TypeError("offline");
      return new Response("network");
    },
    URL,
    Response,
  });
  return {
    events,
    entries,
    deleted,
    offline: () => {
      online = false;
    },
    get skipped() {
      return skipped;
    },
    get claimed() {
      return claimed;
    },
    async lifecycle(name) {
      let promise;
      events[name]({
        waitUntil: (p) => {
          promise = p;
        },
      });
      await promise;
    },
    async request(path, mode = "cors", method = "GET") {
      let response;
      events.fetch({
        request: { url: new URL(path, "https://farm.example").href, method, mode },
        respondWith: (p) => {
          response = p;
        },
      });
      return response ? await response : undefined;
    },
  };
}

test("manifest provides standalone installation and correctly sized PNG icons", async () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.start_url, "/dashboard");
  for (const icon of [
    ...manifest.icons,
    { src: "/icons/apple-touch-icon.png", sizes: "180x180" },
  ]) {
    const png = await readFile(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
});

test("offline navigation returns fallback without caching authenticated HTML", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  assert.equal(await (await sw.request("/dashboard", "navigate")).text(), "network");
  assert.equal(sw.entries.has("/dashboard"), false);
  sw.offline();
  assert.equal(await (await sw.request("/dashboard", "navigate")).text(), "/offline.html");
  assert.equal(await (await sw.request("/icons/icon-192.png")).text(), "/icons/icon-192.png");
});

test("worker does not intercept APIs, auth, mutations, cross-origin or arbitrary assets", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  sw.offline();
  for (const path of [
    "/api/farm",
    "/_server/fn",
    "/auth?token=secret",
    "/assets/app.js",
    "/icons/icon-192.png?token=secret",
    "https://db.example/rest/v1/sheep",
  ]) {
    assert.equal(await sw.request(path), undefined, path);
  }
  assert.equal(await sw.request("/dashboard", "cors", "POST"), undefined);
});

test("activation cleans only this apps obsolete caches; updates require a message", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  assert.equal(sw.skipped, false);
  await sw.lifecycle("activate");
  assert.deepEqual(sw.deleted, ["flockbook-static-v0"]);
  assert.equal(sw.claimed, true);
  sw.events.message({ data: { type: "UNRELATED" } });
  assert.equal(sw.skipped, false);
  sw.events.message({ data: { type: "SKIP_WAITING" } });
  assert.equal(sw.skipped, true);
});
