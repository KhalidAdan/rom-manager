import {
  generateETag,
  globalVersions,
  updateVersion,
  withCache,
} from "@/lib/cache/cache.server";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock cachified since we don't want to test its internals
vi.mock("@epic-web/cachified", () => ({
  default: vi.fn(
    async ({ getFreshValue }: { getFreshValue: () => Promise<unknown> }) =>
      getFreshValue()
  ),
}));

describe("cache.server.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset globalVersions before each test
    Object.keys(globalVersions).forEach((key) => {
      globalVersions[key as keyof typeof globalVersions] = Date.now();
    });
  });

  describe("withCache", () => {
    test("should return data with correct headers and ETag", async () => {
      let mockData = { test: "data" };
      let getFreshValue = vi.fn().mockResolvedValue(mockData);

      let result = await withCache({
        key: "test-key",
        cache: {} as any, // The actual cache implementation doesn't matter for this test
        versionKey: "gameLibrary",
        getFreshValue,
      });

      expect(result).toEqual({
        data: mockData,
        eTag: expect.any(String),
        headers: {
          "Cache-Control": "private, no-cache",
          Vary: "Authorization",
          ETag: expect.any(String),
        },
      });
    });

    test("should propagate errors from getFreshValue", async () => {
      let mockError = new Error("Failed to get fresh value");
      let getFreshValue = vi.fn().mockRejectedValue(mockError);

      await expect(
        withCache({
          key: "test-key",
          cache: {} as any,
          versionKey: "gameLibrary",
          getFreshValue,
        })
      ).rejects.toThrow(mockError);
    });
  });

  describe("updateVersion", () => {
    test("should update global version for specified key", () => {
      let initialVersion = globalVersions.gameLibrary;
      vi.advanceTimersByTime(100); // Ensure time difference

      updateVersion("gameLibrary");

      expect(globalVersions.gameLibrary).toBeGreaterThan(initialVersion);
    });

    test("should update different keys independently", () => {
      let initialGameLibraryVersion = globalVersions.gameLibrary;
      let initialGenreInfoVersion = globalVersions.genreInfo;

      vi.advanceTimersByTime(100);
      updateVersion("gameLibrary");

      expect(globalVersions.gameLibrary).toBeGreaterThan(
        initialGameLibraryVersion
      );
      expect(globalVersions.genreInfo).toBe(initialGenreInfoVersion);
    });
  });

  describe("generateETag", () => {
    test("should generate different ETags for different data", () => {
      let data1 = { id: 1, name: "test1" };
      let data2 = { id: 2, name: "test2" };

      let eTag1 = generateETag(data1, "gameLibrary");
      let eTag2 = generateETag(data2, "gameLibrary");

      expect(eTag1).not.toBe(eTag2);
    });

    test("should generate different ETags for same data with different versions", () => {
      let data = { id: 1, name: "test" };
      let eTag1 = generateETag(data, "gameLibrary");
      vi.setSystemTime(Date.now() + 1000);
      updateVersion("gameLibrary");

      let eTag2 = generateETag(data, "gameLibrary");
      expect(eTag1).not.toBe(eTag2);
    });

    test("should generate consistent ETags for same data and version", () => {
      let data = { id: 1, name: "test" };

      let eTag1 = generateETag(data, "gameLibrary");
      let eTag2 = generateETag(data, "gameLibrary");

      expect(eTag1).toBe(eTag2);
    });

    test("should handle different data types", () => {
      let testCases = [
        "string data",
        { object: "data" },
        [1, 2, 3],
        null,
        undefined,
        123,
        true,
      ];

      testCases.forEach((data) => {
        expect(() => generateETag(data, "gameLibrary")).not.toThrow();
      });
    });
  });
});
