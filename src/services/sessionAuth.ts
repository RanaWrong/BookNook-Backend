import { Db, ObjectId } from "mongodb";

export interface VerifiedUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Resolves a BetterAuth session token (issued by the frontend login) to the
 * account it belongs to, using the `session` and `user` collections the
 * frontend writes to this same database.
 *
 * The caller never supplies identity: id, email and name all come from the
 * database record, so a token can only be minted for a real signed-in user.
 */
export async function resolveSessionUser(
  db: Pick<Db, "collection">,
  sessionToken: unknown,
  now: Date = new Date()
): Promise<VerifiedUser | null> {
  // Strings only: an object here (e.g. { "$ne": "" }) would become a query operator.
  if (typeof sessionToken !== "string" || sessionToken.length < 16 || sessionToken.length > 512) {
    return null;
  }

  const session = await db.collection("session").findOne({ token: sessionToken });
  if (!session) return null;

  // Stored as a BSON Date by BetterAuth; tolerate ISO strings / epoch numbers too.
  const expiresAt = new Date(session.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  // BetterAuth stores references as ObjectId; accept the string form as well.
  const rawUserId = String(session.userId);
  const idCandidates: unknown[] = [rawUserId];
  if (ObjectId.isValid(rawUserId)) idCandidates.push(new ObjectId(rawUserId));

  const user = await db.collection("user").findOne({ _id: { $in: idCandidates } } as any);
  if (!user || typeof user.email !== "string" || user.email.trim() === "") {
    return null;
  }

  return {
    id: String(user._id),
    email: user.email.trim().toLowerCase(),
    name: typeof user.name === "string" && user.name.trim() !== "" ? user.name : "BookNook Member",
  };
}
