import { afterEach, describe, expect, it, vi } from "vitest";
import { createUuidV4 } from "./uuid";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createUuidV4", () => {
  it("uses crypto.randomUUID when available", () => {
    const randomUUID = vi.fn(() => "generated-by-crypto");
    vi.stubGlobal("crypto", { randomUUID });

    expect(createUuidV4()).toBe("generated-by-crypto");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("uses getRandomValues and sets UUID v4 bits when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0);
        return bytes;
      },
    });

    expect(createUuidV4()).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("falls back to Math.random when Web Crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(createUuidV4()).toBe("00000000-0000-4000-8000-000000000000");
  });
});
