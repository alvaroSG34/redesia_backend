export declare class CryptoService {
    private readonly key;
    constructor();
    encrypt(plainText: string): string;
    decrypt(payload: string): string;
}
