// lib/encryption.ts
import crypto from 'crypto';

// Get encryption key from environment variable
const getEncryptionKey = (): Buffer => {
    const key = process.env.API_KEY_ENCRYPTION_KEY;
    if (!key) {
        console.error('API_KEY_ENCRYPTION_KEY not set in environment variables');
        // Fallback to a derived key (not recommended for production)
        return crypto.scryptSync('default-fallback-key', 'salt', 32);
    }
    // If key is in hex format (64 characters)
    if (/^[0-9a-f]{64}$/i.test(key)) {
        return Buffer.from(key, 'hex');
    }
    // Otherwise derive a key from the provided string
    return crypto.scryptSync(key, 'promptops-salt', 32);
};

// Encrypt an API key
export const encryptApiKey = (apiKey: string): string => {
    if (!apiKey) return '';

    try {
        const algorithm = 'aes-256-cbc';
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Store IV with the encrypted data
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Error encrypting API key:', error);
        return '';
    }
};

// Decrypt an API key
export const decryptApiKey = (encryptedData: string): string => {
    if (!encryptedData) return '';

    try {
        const algorithm = 'aes-256-cbc';
        const key = getEncryptionKey();

        const [ivHex, encryptedHex] = encryptedData.split(':');
        if (!ivHex || !encryptedHex) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Error decrypting API key:', error);
        return '';
    }
};

// Check if a string is already encrypted
export const isEncrypted = (value: string): boolean => {
    // Simple check: encrypted values will have the IV:encrypted format
    return value.includes(':') && /^[0-9a-f]+:[0-9a-f]+$/i.test(value);
};