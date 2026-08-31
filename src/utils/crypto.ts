import { User } from "../types";

/**
 * Generates a cryptographically random salt hex string using Web Crypto API.
 */
export function generateRandomSalt(bytesCount = 16): string {
  const array = new Uint8Array(bytesCount);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive a PBKDF2 SHA-256 hash string for a given password and salt.
 */
export async function hashPasswordPbkdf2(
  password: string,
  salt?: string,
  iterations = 100000
): Promise<{ hash: string; salt: string; iterations: number; algorithm: string }> {
  const actualSalt = salt || generateRandomSalt(16);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(actualSalt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await crypto.subtle.exportKey("raw", key);
  const hashBuffer = new Uint8Array(exported);
  const hashHex = Array.from(hashBuffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    hash: hashHex,
    salt: actualSalt,
    iterations,
    algorithm: "PBKDF2-SHA256",
  };
}

/**
 * Creates new secure salted credentials for a user (random unique salt per user).
 */
export async function createPasswordHashForUser(password: string): Promise<{
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  passwordAlgorithm: string;
}> {
  const newSalt = generateRandomSalt(16);
  const res = await hashPasswordPbkdf2(password, newSalt, 100000);
  return {
    passwordHash: res.hash,
    passwordSalt: res.salt,
    passwordIterations: res.iterations,
    passwordAlgorithm: res.algorithm,
  };
}

/**
 * Verifies a user's input password against stored credentials.
 * Handles automatic migration from legacy plain/fixed-salt passwords to random unique salted PBKDF2 credentials.
 */
export async function verifyPassword(
  inputPassword: string,
  user: User
): Promise<{ isValid: boolean; needsMigration: boolean; updatedUser?: User }> {
  // Scenario 1: User has modern passwordSalt + passwordHash
  if (user.passwordSalt && user.passwordHash) {
    const computed = await hashPasswordPbkdf2(
      inputPassword,
      user.passwordSalt,
      user.passwordIterations || 100000
    );
    const isValid = computed.hash === user.passwordHash;
    return { isValid, needsMigration: false };
  }

  // Scenario 2: Legacy fallback (fixed salt hash OR plain text password)
  const legacyPassword = user.password || "";
  if (!legacyPassword) {
    return { isValid: false, needsMigration: false };
  }

  let isMatch = false;

  // Check legacy fixed-salt PBKDF2 hash (64 hex characters)
  if (legacyPassword.length === 64) {
    const legacyHashObj = await hashPasswordPbkdf2(inputPassword, "edutech_salt_2025", 100000);
    if (legacyHashObj.hash === legacyPassword) {
      isMatch = true;
    }
  }

  // Check plain text password
  if (!isMatch && legacyPassword === inputPassword) {
    isMatch = true;
  }

  if (isMatch) {
    // Generate new unique random salt and PBKDF2 hash for user
    const newCredentials = await createPasswordHashForUser(inputPassword);
    const updatedUser: User = {
      ...user,
      passwordHash: newCredentials.passwordHash,
      passwordSalt: newCredentials.passwordSalt,
      passwordIterations: newCredentials.passwordIterations,
      passwordAlgorithm: newCredentials.passwordAlgorithm,
    };
    delete updatedUser.password; // Remove legacy password field

    return {
      isValid: true,
      needsMigration: true,
      updatedUser,
    };
  }

  return { isValid: false, needsMigration: false };
}

