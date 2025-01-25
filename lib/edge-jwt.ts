export function verifyTokenInEdge(token: string, secret: string, debug = false): boolean {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      if (debug) console.error("Invalid token structure.");
      return false;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

    // Validate expiration
    if (!payload.exp || Date.now() >= payload.exp * 1000) {
      if (debug) console.error("JWT expired or invalid exp claim.");
      return false;
    }

    return true;
  } catch (error) {
    if (debug) console.error("Error verifying token in Edge:", error);
    return false;
  }
}
