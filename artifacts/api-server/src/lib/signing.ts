import crypto from "crypto";
import { currentTick } from "./lamport";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

export const getPublicKey = (): string => publicKey as string;

export interface SignedAction {
  signature: string;
  nonce: number;
  timestamp: number;
  digest: string;
}

export const signAction = (action: string, payload: unknown): SignedAction => {
  const nonce = currentTick();
  const timestamp = Date.now();
  const body = JSON.stringify({ action, payload, nonce, timestamp });
  const sign = crypto.createSign("SHA256");
  sign.update(body);
  const signature = sign.sign(privateKey as string, "base64");
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  return { signature, nonce, timestamp, digest };
};

export const verifyAction = (
  action: string,
  payload: unknown,
  nonce: number,
  timestamp: number,
  signature: string,
): boolean => {
  const body = JSON.stringify({ action, payload, nonce, timestamp });
  const verify = crypto.createVerify("SHA256");
  verify.update(body);
  return verify.verify(publicKey as string, signature, "base64");
};
