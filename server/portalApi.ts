import type { Express, Request, Response } from "express";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type DocumentData } from "firebase-admin/firestore";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "ingesa_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type SafeUser = {
  id: string;
  name?: string;
  role?: string;
  gender?: string;
  avatar?: string;
  roleEmoji?: string;
  department?: string;
  departamento?: string;
  area?: string;
  allowedTools?: string[];
  tabOrder?: string[];
  tabActiveColor?: string;
};

type SessionPayload = { uid: string; exp: number };

function getFirebaseDb() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");

  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid");
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase service account is incomplete");
  }

  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
  });
  return getFirestore(app);
}

function jsonError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 20000 ? value : undefined;
}

function safeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string").slice(0, 200);
}

function sanitizeUser(id: string, data: DocumentData): SafeUser {
  return {
    id,
    name: safeString(data.name),
    role: safeString(data.role),
    gender: safeString(data.gender),
    avatar: safeString(data.avatar),
    roleEmoji: safeString(data.roleEmoji),
    department: safeString(data.department),
    departamento: safeString(data.departamento),
    area: safeString(data.area),
    allowedTools: safeStringArray(data.allowedTools),
    tabOrder: safeStringArray(data.tabOrder),
    tabActiveColor: safeString(data.tabActiveColor),
  };
}

function sanitizeUserListing(id: string, data: DocumentData) {
  return {
    id,
    name: safeString(data.name),
    role: safeString(data.role),
    gender: safeString(data.gender),
    avatar: safeString(data.avatar),
    roleEmoji: safeString(data.roleEmoji),
  };
}

function sanitizeTool(id: string, data: DocumentData) {
  return {
    id,
    name: safeString(data.name) ?? "Herramienta",
    emoji: safeString(data.emoji),
    rawHtml: safeString(data.rawHtml),
    isGroup: data.isGroup === true,
    childToolIds: safeStringArray(data.childToolIds),
    scanner: data.scanner === true,
  };
}

function getSessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET is not configured securely");
  return secret;
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", getSessionSecret()).update(body).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.uid || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCookie(req: Request, name: string) {
  const cookies = String(req.headers.cookie ?? "").split(";");
  const entry = cookies.find(cookie => cookie.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : undefined;
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const flags = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (isHttps) flags.push("Secure");
  res.setHeader("Set-Cookie", flags.join("; "));
}

function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPin(pin: string, stored: unknown) {
  if (typeof stored !== "string") return false;
  if (!stored.startsWith("scrypt$")) {
    const left = createHash("sha256").update(pin).digest();
    const right = createHash("sha256").update(stored).digest();
    return timingSafeEqual(left, right);
  }
  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !expectedHex || !/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const actual = scryptSync(pin, salt, 32);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function getCurrentUser(db: FirebaseFirestore.Firestore, req: Request) {
  const session = decodeSession(getCookie(req, SESSION_COOKIE));
  if (!session) return null;
  const snapshot = await db.collection("users").doc(session.uid).get();
  return snapshot.exists ? sanitizeUser(snapshot.id, snapshot.data() ?? {}) : null;
}

export function registerPortalApi(app: Express) {
  app.get("/api/portal/bootstrap", async (req, res) => {
    try {
      const db = getFirebaseDb();
      const [usersSnapshot, toolsSnapshot, tabsOrderSnapshot, guestAccessSnapshot, adminVisibilitySnapshot, currentUser] = await Promise.all([
        db.collection("users").get(),
        db.collection("custom_tools").get(),
        db.collection("settings").doc("tabs_order").get(),
        db.collection("settings").doc("guest_access").get(),
        db.collection("settings").doc("admin_tab_visibility").get(),
        getCurrentUser(db, req),
      ]);

      const users = usersSnapshot.docs
        .map(doc => sanitizeUserListing(doc.id, doc.data()))
        .filter(user => !/root|dev/i.test(user.role ?? ""));
      const tools = toolsSnapshot.docs.map(doc => sanitizeTool(doc.id, doc.data()));
      const guestAccess = guestAccessSnapshot.exists ? guestAccessSnapshot.data() : { allowedTools: [] };
      const adminTabVisibility = currentUser && /admin|root|dev/i.test(currentUser.role ?? "") && adminVisibilitySnapshot.exists
        ? adminVisibilitySnapshot.data()
        : null;

      return res.json({
        users,
        tools,
        tabOrder: safeStringArray(tabsOrderSnapshot.data()?.order) ?? [],
        guestAccess: { allowedTools: safeStringArray(guestAccess?.allowedTools) ?? [] },
        adminTabVisibility: adminTabVisibility && Array.isArray(adminTabVisibility.allowedTools)
          ? { allowedTools: safeStringArray(adminTabVisibility.allowedTools) ?? [] }
          : null,
        currentUser,
        isReady: tools.length > 0 || users.length > 0,
      });
    } catch (error) {
      console.error("[Portal API] bootstrap failed", error instanceof Error ? error.message : "unknown error");
      return jsonError(res, 503, "Portal data is temporarily unavailable");
    }
  });

  app.post("/api/portal/login", async (req, res) => {
    const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
    const pin = typeof req.body?.pin === "string" ? req.body.pin.trim() : "";
    if (!userId || !/^\d{4}$/.test(pin)) return jsonError(res, 401, "Invalid credentials");

    try {
      const db = getFirebaseDb();
      const snapshot = await db.collection("users").doc(userId).get();
      const data = snapshot.data() ?? {};
      const role = String(data.role ?? "").toLowerCase();
      const valid = snapshot.exists && !/root|dev/.test(role) && verifyPin(pin, data.pin);
      if (!valid) return jsonError(res, 401, "Invalid credentials");

      if (typeof data.pin === "string" && !data.pin.startsWith("scrypt$")) {
        await snapshot.ref.update({ pin: hashPin(pin) });
      }

      const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
      setSessionCookie(req, res, encodeSession({ uid: snapshot.id, exp: expiresAt }));
      return res.json(sanitizeUser(snapshot.id, data));
    } catch (error) {
      console.error("[Portal API] login failed", error instanceof Error ? error.message : "unknown error");
      return jsonError(res, 503, "Authentication is temporarily unavailable");
    }
  });

  app.post("/api/portal/logout", (req, res) => {
    clearSessionCookie(res);
    return res.json({ success: true });
  });
}
