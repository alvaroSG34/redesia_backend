import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  it('encrypts and decrypts a value', () => {
    process.env.APP_ENCRYPTION_KEY = 'unit-test-key';
    const service = new CryptoService();

    const encrypted = service.encrypt('secret-token');

    expect(encrypted).not.toEqual('secret-token');
    expect(service.decrypt(encrypted)).toEqual('secret-token');
  });

  it('throws on invalid payload', () => {
    const service = new CryptoService();

    expect(() => service.decrypt('invalid')).toThrow();
  });
});
