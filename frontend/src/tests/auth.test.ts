import { describe, it, expect } from "vitest";
import { getUserRole } from "../lib/auth";

describe("Auth utils", () => {
  it("returns null when no token", () => {
    localStorage.removeItem("token");
    expect(getUserRole()).toBeNull();
  });
});
