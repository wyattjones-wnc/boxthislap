import { createECDH } from "node:crypto";

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();

const publicKey = ecdh.getPublicKey();
const privateKey = ecdh.getPrivateKey();

function base64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

console.log("VAPID_PUBLIC_KEY=" + base64Url(publicKey));
console.log("VAPID_PRIVATE_KEY=" + base64Url(privateKey));
