import {
  cache,
  generateETag,
  updateVersion,
  withCache,
} from "@/lib/cache/cache.server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Regression suite for the stale-borrow bug (Aug 2026).
 *
 * Loaders send an ETag and rely on the browser revalidating on every
 * request. A Cache-Control with a positive max-age let the browser skip
 * revalidation entirely, so after a mutation (e.g. Return Game) React
 * Router's revalidation was answered by the browser's HTTP cache with
 * pre-mutation data — the UI showed a game as still borrowed after a
 * successful return.
 *
 * These tests intentionally run against the real cachified + LRU cache
 * (no mocks) and assert the caching CONTRACT, not exact header strings.
 * If one of them fails, do not just update the assertion — the borrow/
 * return flow is probably broken in the browser again.
 */
describe("loader cache revalidation contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cache.clear();
    vi.useRealTimers();
  });

  test("Cache-Control always forces revalidation", async () => {
    let { headers } = await withCache({
      key: "revalidation-header-test",
      cache,
      versionKey: "detailedInfo",
      getFreshValue: async () => ({ some: "data" }),
    });

    let cacheControl = headers["Cache-Control"].toLowerCase();

    // no-cache means "store, but revalidate before every reuse" — the
    // mode the ETag design depends on.
    expect(cacheControl).toContain("no-cache");

    // Any positive max-age / s-maxage lets the browser (or a proxy)
    // reuse the response without asking the server, which serves stale
    // loader data after mutations.
    expect(cacheControl).not.toMatch(/max-age\s*=\s*0*[1-9]/);

    // Loader data is per-user; shared caches must never store it.
    expect(cacheControl).toContain("private");
  });

  test("second read within TTL is served from cache (baseline)", async () => {
    let value = "before";
    let read = () =>
      withCache({
        key: "revalidation-baseline-test",
        cache,
        versionKey: "detailedInfo",
        getFreshValue: async () => value,
      });

    let first = await read();
    value = "after";
    let second = await read();

    // Proves the invalidation test below isn't passing vacuously: the
    // cache genuinely holds on to data until it is invalidated.
    expect(first.data).toBe("before");
    expect(second.data).toBe("before");
  });

  test("mutation-style invalidation serves fresh data with a new ETag", async () => {
    let value = "before";
    let key = "revalidation-invalidation-test";
    let read = () =>
      withCache({
        key,
        cache,
        versionKey: "detailedInfo",
        getFreshValue: async () => value,
      });

    let stale = await read();
    value = "after";

    // What every mutating action (borrow, return, revoke, delete) does:
    vi.advanceTimersByTime(10);
    updateVersion("detailedInfo");
    cache.delete(key);

    let fresh = await read();

    expect(fresh.data).toBe("after");
    expect(fresh.eTag).not.toBe(stale.eTag);
  });

  test("a version bump alone changes the ETag for identical data", async () => {
    // After a mutation, a client holding the old ETag must not get a 304
    // for it — even when the rendered data happens to serialize the same.
    let data = { unchanged: true };

    let before = generateETag(data, "detailedInfo");
    vi.advanceTimersByTime(10);
    updateVersion("detailedInfo");
    let after = generateETag(data, "detailedInfo");

    expect(after).not.toBe(before);
  });
});
