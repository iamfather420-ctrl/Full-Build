import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAdminUser(): AuthenticatedUser {
  return {
    id: 1,
    openId: "admin-open-id",
    email: "admin@solvex.com",
    name: "Admin Solver",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function makeRegularUser(): AuthenticatedUser {
  return {
    id: 2,
    openId: "user-open-id",
    email: "client@example.com",
    name: "Test Client",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function makeContext(user: AuthenticatedUser | null = null): TrpcContext {
  const clearedCookies: string[] = [];
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string) => clearedCookies.push(name),
    } as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("client@example.com");
    expect(result?.role).toBe("user");
  });

  it("returns admin user with correct role", async () => {
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeContext(admin));
    const result = await caller.auth.me();
    expect(result?.role).toBe("admin");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx: TrpcContext = {
      user: makeRegularUser(),
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      httpOnly: true,
      path: "/",
    });
  });
});

// ─── Problem Access Control Tests ────────────────────────────────────────────

describe("problems.list (public access)", () => {
  it("allows unauthenticated users to list problems", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    // This should not throw — it's a public procedure
    // In a real DB test, it would return an empty array
    await expect(caller.problems.list({ limit: 5, offset: 0 })).resolves.toBeDefined();
  });
});

describe("problems.stats (public access)", () => {
  it("allows unauthenticated users to view stats", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    const stats = await caller.problems.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("open");
    expect(stats).toHaveProperty("solved");
    expect(stats).toHaveProperty("inReview");
  });
});

describe("problems.myProblems (protected)", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.problems.myProblems()).rejects.toThrow();
  });

  it("allows authenticated users to access their problems", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(caller.problems.myProblems()).resolves.toBeDefined();
  });
});

// ─── Admin Access Control Tests ──────────────────────────────────────────────

describe("crawler.run (admin only)", () => {
  it("throws FORBIDDEN for regular users", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(
      caller.crawler.run({ platforms: ["reddit"], limit: 2 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("solutions.submit (admin only)", () => {
  it("throws FORBIDDEN for regular users", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(
      caller.solutions.submit({ problemId: 1, content: "This is a detailed solution to the problem." })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("verification.verify (admin only)", () => {
  it("throws FORBIDDEN for regular users", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(
      caller.verification.verify({ solutionId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("earnings.stats (admin only)", () => {
  it("throws FORBIDDEN for regular users", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(caller.earnings.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin to access earnings stats", async () => {
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeContext(admin));
    await expect(caller.earnings.stats()).resolves.toBeDefined();
  });
});

// ─── Notification Tests ───────────────────────────────────────────────────────

describe("notifications.list (protected)", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.notifications.list()).rejects.toThrow();
  });

  it("allows authenticated users to list their notifications", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(caller.notifications.list()).resolves.toBeDefined();
  });
});

describe("notifications.unreadCount (protected)", () => {
  it("returns unread count for authenticated users", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    const count = await caller.notifications.unreadCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ─── Input Validation Tests ───────────────────────────────────────────────────

describe("problems.create input validation", () => {
  it("throws when title is too short", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(
      caller.problems.create({
        title: "Short",
        description: "A valid description that is long enough to pass validation",
        category: "technical",
        paymentOffer: 50,
      })
    ).rejects.toThrow();
  });

  it("throws when description is too short", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(
      caller.problems.create({
        title: "A valid title that is long enough",
        description: "Too short",
        category: "technical",
        paymentOffer: 50,
      })
    ).rejects.toThrow();
  });

  it("throws when payment offer is zero", async () => {
    const user = makeRegularUser();
    const caller = appRouter.createCaller(makeContext(user));
    await expect(
      caller.problems.create({
        title: "A valid title that is long enough",
        description: "A valid description that is long enough to pass validation requirements",
        category: "technical",
        paymentOffer: 0,
      })
    ).rejects.toThrow();
  });
});
