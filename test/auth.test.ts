import { test } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { resolveSessionUser } from "../src/services/sessionAuth";
import { getAllowedOrigins, getJwtSecret } from "../src/config/env";

const userOid = new ObjectId();
const future = new Date(Date.now() + 60_000);
const past = new Date(Date.now() - 60_000);
const TOKEN = "a".repeat(32);

function fakeDb(sessions: any[], users: any[]) {
  const calls = { session: 0, user: 0 };
  const db = {
    collection(name: string) {
      return {
        async findOne(filter: any) {
          if (name === "session") {
            calls.session++;
            return sessions.find((s) => s.token === filter.token) ?? null;
          }
          calls.user++;
          const wanted = filter._id.$in.map(String);
          return users.find((u) => wanted.includes(String(u._id))) ?? null;
        },
      };
    },
  } as any;
  return { db, calls };
}

const goodUser = { _id: userOid, email: "Reader@Example.com ", name: "Real Reader" };

test("valid session returns identity from the database, not the caller", async () => {
  const { db } = fakeDb([{ token: TOKEN, userId: userOid, expiresAt: future }], [goodUser]);
  const user = await resolveSessionUser(db, TOKEN);
  assert.deepEqual(user, { id: String(userOid), email: "reader@example.com", name: "Real Reader" });
});

test("string userId on the session still resolves", async () => {
  const { db } = fakeDb([{ token: TOKEN, userId: String(userOid), expiresAt: future }], [goodUser]);
  assert.equal((await resolveSessionUser(db, TOKEN))?.id, String(userOid));
});

test("unknown token is rejected", async () => {
  const { db } = fakeDb([{ token: TOKEN, userId: userOid, expiresAt: future }], [goodUser]);
  assert.equal(await resolveSessionUser(db, "b".repeat(32)), null);
});

test("expired session is rejected", async () => {
  const { db } = fakeDb([{ token: TOKEN, userId: userOid, expiresAt: past }], [goodUser]);
  assert.equal(await resolveSessionUser(db, TOKEN), null);
});

test("session whose user no longer exists is rejected", async () => {
  const { db } = fakeDb([{ token: TOKEN, userId: userOid, expiresAt: future }], []);
  assert.equal(await resolveSessionUser(db, TOKEN), null);
});

test("non-string tokens (NoSQL operator injection) never reach the database", async () => {
  const { db, calls } = fakeDb([{ token: TOKEN, userId: userOid, expiresAt: future }], [goodUser]);
  for (const bad of [{ $ne: "" }, { $gt: "" }, ["x"], 12345, null, undefined, "", "short"]) {
    assert.equal(await resolveSessionUser(db, bad as unknown), null);
  }
  assert.equal(calls.session, 0);
});

test("getJwtSecret has no fallback and rejects weak values", () => {
  const original = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.throws(() => getJwtSecret(), /JWT_SECRET/);
    for (const weak of ["short", "your_" + "a".repeat(40), "booknook-" + "b".repeat(40), "c".repeat(20) + "changeme" + "d".repeat(20)]) {
      process.env.JWT_SECRET = weak;
      assert.throws(() => getJwtSecret(), /JWT_SECRET/);
    }
    process.env.JWT_SECRET = "Zk3p9Qw7Lr2Vb8Nx4Td6Hy1Gm5Cs0Ju+AeFiOoRt/q==";
    assert.equal(getJwtSecret(), process.env.JWT_SECRET);
  } finally {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  }
});

test("CORS origins: configured list, dev default, closed in production", () => {
  const keep = { c: process.env.CORS_ORIGINS, u: process.env.CLIENT_URL, n: process.env.NODE_ENV };
  try {
    delete process.env.CORS_ORIGINS;
    delete process.env.CLIENT_URL;
    (process.env as any).NODE_ENV = "development";
    assert.deepEqual(getAllowedOrigins(), ["http://localhost:3000"]);
    (process.env as any).NODE_ENV = "production";
    assert.deepEqual(getAllowedOrigins(), []);
    process.env.CORS_ORIGINS = "https://app.example.com/, https://b.example.com";
    assert.deepEqual(getAllowedOrigins(), ["https://app.example.com", "https://b.example.com"]);
  } finally {
    for (const [k, v] of [["CORS_ORIGINS", keep.c], ["CLIENT_URL", keep.u], ["NODE_ENV", keep.n]] as const) {
      if (v === undefined) delete (process.env as any)[k];
      else (process.env as any)[k] = v;
    }
  }
});
