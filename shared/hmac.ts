import crypto from 'crypto';

export function generateHmacSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateHmacSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export function extractSignatureFromHeader(header: string): string {
  // Extract signature from "sha256=<signature>" format
  const match = header.match(/^sha256=([a-f0-9]+)$/);
  if (!match) {
    throw new Error('Invalid signature format');
  }
  return match[1];
}
