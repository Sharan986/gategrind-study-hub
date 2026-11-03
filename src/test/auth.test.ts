import { describe, it, expect } from "vitest";
import { hmacSign, hmacVerify, authenticateGoogleUser, resolveSessionFromCookie, invalidateSession } from "../server/auth";
import { getDatabase } from "../server/db";

describe("Authentication & Session Security", () => {
  const secret = "test-secret-key-12345678901234567890";

  it("generates and verifies HMAC-SHA256 signatures correctly", async () => {
    const data = "ses_abc123456";
    const sig = await hmacSign(data, secret);
    expect(typeof sig).toBe("string");
    expect(sig.length).toBe(64); // SHA-256 hex is 64 chars

    const valid = await hmacVerify(data, sig, secret);
    expect(valid).toBe(true);

    const tampered = await hmacVerify(data + "tampered", sig, secret);
    expect(tampered).toBe(false);
  });

  it("authenticates Google identity and establishes signed session in D1", async () => {
    const db = getDatabase();
    const googlePayload = {
      sub: "google_user_998877",
      email: "test.student@example.com",
      email_verified: true,
      name: "Test Student",
      picture: "https://example.com/avatar.png",
    };

    const { user, cookieValue, sessionId } = await authenticateGoogleUser(
      googlePayload,
      db,
      secret,
      { userAgent: "Vitest/TestRunner" }
    );

    expect(user).toBeDefined();
    expect(user.email).toBe("test.student@example.com");
    expect(user.display_name).toBe("Test Student");
    expect(user.role).toBe("student");
    expect(cookieValue.startsWith(sessionId)).toBe(true);

    // Resolve session back from cookie
    const resolved = await resolveSessionFromCookie(
      `gategrind_session=${cookieValue}`,
      db,
      secret
    );
    expect(resolved).not.toBeNull();
    expect(resolved?.user.id).toBe(user.id);
    expect(resolved?.session.id).toBe(sessionId);

    // Invalidate session
    await invalidateSession(sessionId, db);
    const resolvedAfterLogout = await resolveSessionFromCookie(
      `gategrind_session=${cookieValue}`,
      db,
      secret
    );
    expect(resolvedAfterLogout).toBeNull();
  });
});
