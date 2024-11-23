import {
  withClientCache,
  type CachedData,
  type StoreKey,
} from "@/lib/cache/cache.client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("localforage", () => {
  return {
    default: {
      createInstance: vi.fn().mockReturnValue({
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }),
      INDEXEDDB: "asyncStorage",
      WEBSQL: "webSQLStorage",
      LOCALSTORAGE: "localStorageWrapper",
    },
  };
});

describe("cache.client.ts", () => {
  const TTL = 5000;
  let mockStore: ReturnType<
    // @ts-expect-error
    typeof import("localforage").default.createInstance
  >;

  beforeEach(async () => {
    vi.useFakeTimers({ now: Date.now() });
    vi.clearAllMocks();

    let localforage = await import("localforage");
    mockStore = localforage.default.createInstance({
      name: "gameLibrary",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Cache Hits", () => {
    test("should return cached data if within TTL", async () => {
      let mockData = { test: "data", eTag: "123" };
      let mockCached: CachedData<typeof mockData> = {
        data: mockData,
        timestamp: Date.now(),
        eTag: "123",
      };

      vi.mocked(mockStore.getItem).mockResolvedValue(mockCached);
      let serverLoader = vi.fn().mockResolvedValue({ fresh: "data" });

      let result = await withClientCache({
        store: "gameLibrary",
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(mockStore.getItem).toHaveBeenCalledWith("test-key");
      expect(serverLoader).not.toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    test("should return cached data if exactly at TTL", async () => {
      let mockData = { test: "data", eTag: "123" };
      let mockCached: CachedData<typeof mockData> = {
        data: mockData,
        timestamp: Date.now() - (TTL - 1), // Exactly at TTL
        eTag: "123",
      };

      vi.mocked(mockStore.getItem).mockResolvedValue(mockCached);
      let serverLoader = vi.fn().mockResolvedValue({ fresh: "data" });

      let result = await withClientCache({
        store: "gameLibrary",
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(result).toEqual(mockData);
      expect(serverLoader).not.toHaveBeenCalled();
    });
  });

  describe("Cache Misses", () => {
    test("should fetch fresh data if cache is expired", async () => {
      let mockData = { test: "data", eTag: "123" };
      let mockCached: CachedData<typeof mockData> = {
        data: mockData,
        timestamp: Date.now() - 5001, // Just expired
        eTag: "123",
      };

      vi.mocked(mockStore.getItem).mockResolvedValue(mockCached);
      let freshData = { fresh: "data", eTag: "456" };
      let serverLoader = vi.fn().mockResolvedValue(freshData);

      let result = await withClientCache({
        store: "gameLibrary",
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(result).toEqual(freshData);
      expect(serverLoader).toHaveBeenCalled();
      expect(mockStore.setItem).toHaveBeenCalledWith(
        "test-key",
        expect.objectContaining({
          data: freshData,
          eTag: "456",
        })
      );
    });

    test("should fetch fresh data if cache is empty", async () => {
      vi.mocked(mockStore.getItem).mockResolvedValue(null);
      let freshData = { fresh: "data", eTag: "456" };
      let serverLoader = vi.fn().mockResolvedValue(freshData);

      let result = await withClientCache({
        store: "gameLibrary",
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(result).toEqual(freshData);
      expect(serverLoader).toHaveBeenCalled();
      expect(mockStore.setItem).toHaveBeenCalledWith(
        "test-key",
        expect.objectContaining({
          data: freshData,
        })
      );
    });
  });

  describe("304 Responses", () => {
    test("should update timestamp and return cached data on 304", async () => {
      let mockData = { test: "data", eTag: "123" };
      let oldTimestamp = Date.now() - 6000;
      let mockCached: CachedData<typeof mockData> = {
        data: mockData,
        timestamp: oldTimestamp,
        eTag: "123",
      };

      vi.mocked(mockStore.getItem).mockResolvedValue(mockCached);
      let serverLoader = vi
        .fn()
        .mockRejectedValue(new Response(null, { status: 304 }));

      let result = await withClientCache({
        store: "gameLibrary",
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(result.data).toEqual(mockData);
      const setItemCall = vi.mocked(mockStore.setItem).mock.calls[0];
      const [key, savedData] = setItemCall;

      // Check the structure piece by piece
      expect(key).toBe("test-key");
      expect(savedData.data).toEqual({
        data: mockCached.data, // Should be the same data reference
        eTag: mockCached.eTag, // Should keep same eTag
        timestamp: expect.any(Number), // Should be a new timestamp
      });

      // Verify timestamp was actually updated
      expect(
        (savedData as CachedData<typeof mockData>).timestamp
      ).toBeGreaterThan(oldTimestamp);
    });

    test("should throw if 304 received with no cached data", async () => {
      vi.mocked(mockStore.getItem).mockResolvedValue(null);
      let serverLoader = vi
        .fn()
        .mockRejectedValue(new Response(null, { status: 304 }));

      await expect(
        withClientCache({
          store: "gameLibrary",
          cacheKey: "test-key",
          ttl: TTL,
          serverLoader,
          params: {},
        })
      ).rejects.toThrow();
    });
  });

  describe("Cache Keys", () => {
    test("should handle string cache keys", async () => {
      vi.mocked(mockStore.getItem).mockResolvedValue(null);
      let serverLoader = vi.fn().mockResolvedValue({ data: "test" });

      await withClientCache({
        store: "gameLibrary",
        cacheKey: "simple-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(mockStore.getItem).toHaveBeenCalledWith("simple-key");
    });

    test("should handle function cache keys", async () => {
      vi.mocked(mockStore.getItem).mockResolvedValue(null);
      let serverLoader = vi.fn().mockResolvedValue({ data: "test" });
      let cacheKeyFn = (params: { id?: string }) => `prefix-${params.id}`;

      await withClientCache({
        store: "gameLibrary",
        cacheKey: cacheKeyFn,
        ttl: TTL,
        serverLoader,
        params: { id: "123" },
      });

      expect(mockStore.getItem).toHaveBeenCalledWith("prefix-123");
    });
  });

  describe("Error Handling", () => {
    test("should fall back to server loader on cache read error", async () => {
      let consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(mockStore.getItem).mockRejectedValue(
        new Error("Cache read error")
      );
      let freshData = { fresh: "data" };
      let serverLoader = vi.fn().mockResolvedValue(freshData);

      let result = await withClientCache({
        store: "gameLibrary",
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(result).toEqual(freshData);
      expect(serverLoader).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    });

    test("should still return data if cache write fails", async () => {
      let consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(mockStore.getItem).mockResolvedValue(null);
      vi.mocked(mockStore.setItem).mockRejectedValue(
        new Error("Cache write error")
      );

      let freshData = { fresh: "data" };
      let serverLoader = vi.fn().mockResolvedValue(freshData);

      let result = await withClientCache({
        store: "gameLibrary",
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(result).toEqual(freshData);
      expect(consoleError).toHaveBeenCalled();
    });

    test("should throw non-304 server errors", async () => {
      vi.mocked(mockStore.getItem).mockResolvedValue(null);
      let serverLoader = vi.fn().mockRejectedValue(new Error("Server error"));

      await expect(
        withClientCache({
          store: "gameLibrary",
          cacheKey: "test-key",
          ttl: TTL,
          serverLoader,
          params: {},
        })
      ).rejects.toThrow("Server error");
    });
  });

  describe("Store Types", () => {
    let stores: StoreKey[] = ["gameLibrary", "genreInfo", "detailedInfo"];

    test.each(stores)("should work with %s store", async (store) => {
      vi.mocked(mockStore.getItem).mockResolvedValue(null);
      let serverLoader = vi.fn().mockResolvedValue({ test: store });

      await withClientCache({
        store,
        cacheKey: "test-key",
        ttl: TTL,
        serverLoader,
        params: {},
      });

      expect(mockStore.getItem).toHaveBeenCalledWith("test-key");
    });
  });
});
