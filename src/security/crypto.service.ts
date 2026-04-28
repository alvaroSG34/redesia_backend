import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.APP_ENCRYPTION_KEY ?? 'dev-only-change-me';
    this.key = createHash('sha256').update(rawKey).digest();
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [ivText, tagText, dataText] = payload.split('.');
    if (!ivText || !tagText || !dataText) {
      throw new Error('Encrypted payload format is invalid');
    }

    const iv = Buffer.from(ivText, 'base64');
    const tag = Buffer.from(tagText, 'base64');
    const encrypted = Buffer.from(dataText, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
