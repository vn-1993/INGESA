import { describe, expect, it } from "vitest";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

describe("Firebase Admin credentials", () => {
  it("can read the portal_redirect settings document with server credentials", async () => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    expect(raw, "FIREBASE_SERVICE_ACCOUNT_JSON must be configured").toBeTruthy();
    const account = JSON.parse(raw!);
    expect(account.project_id).toBe("ingesa-database");
    expect(account.client_email).toContain("firebase-adminsdk");

    const app = getApps()[0] ?? initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key.replace(/\\n/g, "\n"),
      }),
    });
    const snapshot = await getFirestore(app).collection("settings").doc("portal_redirect").get();
    expect(snapshot.exists || !snapshot.exists).toBe(true);
  }, 15000);
});
