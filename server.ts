import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Single-User Platform Lock & Persistent Configuration
// ---------------------------------------------------------------------------
// The platform enforces a strict SINGLE-USER policy:
// Only ONE permanent owner exists. Any subsequent registration attempts
// return "Registration is closed. System initialized."
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'pawanyadav3714@gmail.com').toLowerCase().trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || 'pawanyadav3714@gmail.com').toLowerCase().trim();
const SECONDARY_ADMIN_USER = 'admin@barozza.com';

const DEFAULT_FALLBACK_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@Barozza2026!';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(DEFAULT_FALLBACK_PASSWORD, 10);

interface SingleUserLockRecord {
  isInitialized: boolean;
  ownerEmail: string;
  ownerName: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  passwordHash?: string;
  authProvider: 'password' | 'google';
  registeredAt: string;
  lastLoginAt: string;
}

const LOCK_FILE_PATH = path.resolve(__dirname, 'single_user_lock.json');

function loadOwnerLockFromDisk(): SingleUserLockRecord {
  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const content = fs.readFileSync(LOCK_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.isInitialized && parsed.ownerEmail) {
        return parsed;
      }
    }
  } catch (e) {}

  // Fallback to designated owner from environment
  return {
    isInitialized: true,
    ownerEmail: ADMIN_EMAIL,
    ownerName: 'Pawan Yadav (Owner)',
    ownerFirstName: 'Pawan',
    ownerLastName: 'Yadav',
    passwordHash: ADMIN_PASSWORD_HASH,
    authProvider: 'password',
    registeredAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: new Date().toISOString()
  };
}

let activeLock: SingleUserLockRecord = loadOwnerLockFromDisk();

function saveOwnerLockToDisk(lock: SingleUserLockRecord) {
  activeLock = lock;
  try {
    fs.writeFileSync(LOCK_FILE_PATH, JSON.stringify(lock, null, 2), 'utf-8');
  } catch (e) {}
}

// Secret for signing session tokens
const SESSION_SECRET = process.env.SESSION_SECRET || 'barozza-secure-admin-session-secret-2026-xyz789';

// In-memory store for active session tokens
const activeSessions = new Map<string, { username: string; email: string; createdAt: number; expiresAt: number }>();

// ---------------------------------------------------------------------------
// 2. Brute-Force Rate Limiting (In-Memory per IP)
// ---------------------------------------------------------------------------
interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
}
const loginRateLimitMap = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes lockout after 5 failures

function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  if (record.lockoutUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // If lockout window passed, reset
  if (record.lockoutUntil <= now && record.attempts >= MAX_ATTEMPTS) {
    loginRateLimitMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  return { allowed: true, remainingAttempts: remaining, retryAfterSeconds: 0 };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip) || { attempts: 0, lockoutUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_WINDOW_MS;
  }
  loginRateLimitMap.set(ip, record);
}

function resetRateLimit(ip: string) {
  loginRateLimitMap.delete(ip);
}

// ---------------------------------------------------------------------------
// 3. Cryptographic Token Generation & Verification
// ---------------------------------------------------------------------------
function generateSessionToken(username: string, email: string): string {
  const payload = JSON.stringify({
    username,
    email,
    role: 'admin',
    nonce: crypto.randomBytes(16).toString('hex'),
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours validity
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  const token = `${encodedPayload}.${signature}`;

  // Store in active sessions
  activeSessions.set(token, {
    username,
    email,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });

  return token;
}

function verifySessionToken(token: string): { valid: boolean; user?: { username: string; email: string; role: string } } {
  if (!token || !token.includes('.')) return { valid: false };

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return { valid: false };

  // Verify HMAC-SHA256 signature
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  if (signature !== expectedSig) {
    return { valid: false };
  }

  try {
    const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const data = JSON.parse(raw);

    if (!data.expiresAt || Date.now() > data.expiresAt) {
      activeSessions.delete(token);
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        username: data.username,
        email: data.email,
        role: data.role || 'admin'
      }
    };
  } catch (err) {
    return { valid: false };
  }
}

// ---------------------------------------------------------------------------
// 4. Server Initialization & Authentication Routes
// ---------------------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Basic Middlewares
  app.use(express.json());
  app.use(cookieParser());

  // Extract client IP helper
  const getClientIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.socket.remoteAddress || '127.0.0.1';
  };

  // Auth Middleware for extracting session user
  const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.admin_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No active admin session found.' });
    }

    const { valid, user } = verifySessionToken(token);
    if (!valid || !user) {
      return res.status(401).json({ error: 'Unauthorized: Session is invalid or expired.' });
    }

    (req as any).adminUser = user;
    next();
  };

  // -------------------------------------------------------------------------
  // Auth API Endpoints (Strict Single-User Platform Lock)
  // -------------------------------------------------------------------------

  // 0. Query Single-User Lock Status
  app.get('/api/auth/single-user-lock', (_req: Request, res: Response) => {
    return res.json({
      isInitialized: activeLock.isInitialized,
      ownerEmail: activeLock.isInitialized ? activeLock.ownerEmail : '',
      ownerName: activeLock.isInitialized ? activeLock.ownerName : '',
      authProvider: activeLock.authProvider,
      registeredAt: activeLock.registeredAt
    });
  });

  // 1. Initial Owner Registration (Only allowed ONCE for the very first person)
  app.post('/api/auth/register-owner', (req: Request, res: Response) => {
    // If an owner already exists, permanently lock out new signups
    if (activeLock.isInitialized) {
      return res.status(403).json({
        error: 'Registration is closed. System initialized.',
        isLocked: true
      });
    }

    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First Name, Last Name, Email, and Password are all required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    const newLock: SingleUserLockRecord = {
      isInitialized: true,
      ownerEmail: cleanEmail,
      ownerName: fullName,
      ownerFirstName: String(firstName).trim(),
      ownerLastName: String(lastName).trim(),
      passwordHash,
      authProvider: 'password',
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    saveOwnerLockToDisk(newLock);

    const sessionToken = generateSessionToken(cleanEmail, cleanEmail);
    res.cookie('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Owner onboarded and system locked permanently.',
      token: sessionToken,
      user: {
        username: cleanEmail,
        email: cleanEmail,
        name: fullName,
        role: 'admin'
      },
      lock: {
        isInitialized: true,
        ownerEmail: cleanEmail,
        ownerName: fullName
      }
    });
  });

  // 2. Password Login (Strict Single Admin User Verification + Rate Limiting)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Locked out for security. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds
      });
    }

    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const normalizedUser = String(username).toLowerCase().trim();

    // Verify system initialization
    if (!activeLock.isInitialized) {
      return res.status(400).json({
        error: 'System is not yet initialized. Please complete owner onboarding first.',
        uninitialized: true
      });
    }

    // Check single admin username/email
    const isAuthorizedUsername = 
      normalizedUser === activeLock.ownerEmail.toLowerCase().trim() ||
      normalizedUser === ADMIN_USERNAME ||
      normalizedUser === ADMIN_EMAIL ||
      normalizedUser === SECONDARY_ADMIN_USER ||
      normalizedUser === 'pawanyadav3714@gmail.com' ||
      normalizedUser === 'rohit' ||
      normalizedUser === 'admin';

    if (!isAuthorizedUsername) {
      recordFailedAttempt(ip);
      return res.status(403).json({
        error: 'Registration is closed. System initialized.',
        isLocked: true
      });
    }

    // Verify Password using bcrypt
    const hashToVerify = activeLock.passwordHash || ADMIN_PASSWORD_HASH;
    const isPasswordValid = bcrypt.compareSync(password, hashToVerify);

    if (!isPasswordValid) {
      recordFailedAttempt(ip);
      const updatedCheck = checkRateLimit(ip);
      return res.status(401).json({
        error: 'Invalid credentials. Please verify your admin password.',
        remainingAttempts: updatedCheck.remainingAttempts,
        retryAfterSeconds: updatedCheck.retryAfterSeconds
      });
    }

    // Reset rate limit on success
    resetRateLimit(ip);

    // Create secure session
    const sessionToken = generateSessionToken(normalizedUser, activeLock.ownerEmail || ADMIN_EMAIL);
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // Set secure HTTP-only cookie
    res.cookie('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge
    });

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      token: sessionToken,
      user: {
        username: normalizedUser,
        email: activeLock.ownerEmail || ADMIN_EMAIL,
        name: activeLock.ownerName || 'The Admin (Rohit / Pawan)',
        role: 'admin'
      }
    });
  });

  // 3. Google OAuth Admin Verification
  app.post('/api/auth/google', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed attempts. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds
      });
    }

    const { email, displayName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Google account email is required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // If system is uninitialized, the first person with Google becomes the permanent owner!
    if (!activeLock.isInitialized) {
      const fullName = displayName || normalizedEmail.split('@')[0];
      const newLock: SingleUserLockRecord = {
        isInitialized: true,
        ownerEmail: normalizedEmail,
        ownerName: fullName,
        ownerFirstName: fullName.split(' ')[0] || 'Admin',
        ownerLastName: fullName.split(' ').slice(1).join(' ') || 'Owner',
        authProvider: 'google',
        registeredAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      saveOwnerLockToDisk(newLock);

      const sessionToken = generateSessionToken(normalizedEmail, normalizedEmail);
      res.cookie('admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        message: 'Owner onboarded via Google and system locked permanently.',
        token: sessionToken,
        user: {
          username: normalizedEmail,
          email: normalizedEmail,
          name: fullName,
          role: 'admin'
        },
        lock: newLock
      });
    }

    // Verify if Google account email matches designated permanent owner
    const isAuthorizedGoogleUser = 
      normalizedEmail === activeLock.ownerEmail.toLowerCase().trim() ||
      normalizedEmail === ADMIN_EMAIL ||
      normalizedEmail === ADMIN_USERNAME ||
      normalizedEmail === 'pawanyadav3714@gmail.com' ||
      normalizedEmail.includes('pawanyadav3714');

    if (!isAuthorizedGoogleUser) {
      recordFailedAttempt(ip);
      return res.status(403).json({
        error: 'Registration is closed. System initialized.',
        isLocked: true
      });
    }

    // Reset rate limit on successful admin authorization
    resetRateLimit(ip);

    // Create session token
    const sessionToken = generateSessionToken(normalizedEmail, normalizedEmail);

    res.cookie('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for Google sign-in
    });

    return res.json({
      success: true,
      message: 'Google Admin authorization verified.',
      token: sessionToken,
      user: {
        username: normalizedEmail,
        email: normalizedEmail,
        name: displayName || activeLock.ownerName || 'Rohit / Pawan (Admin)',
        role: 'admin'
      }
    });
  });

  // 3. Get Current Authenticated Session (`/api/auth/me`)
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = req.cookies?.admin_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) {
      return res.json({ authenticated: false });
    }

    const { valid, user } = verifySessionToken(token);
    if (!valid || !user) {
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      user: {
        username: user.username,
        email: user.email,
        name: 'The Admin (Rohit / Pawan)',
        role: 'admin'
      }
    });
  });

  // 4. Logout Endpoint (Destroys session and clears cookie)
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = req.cookies?.admin_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (token) {
      activeSessions.delete(token);
    }

    res.clearCookie('admin_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.json({ success: true, message: 'Logged out successfully.' });
  });

  // 5. Config Info (Public non-sensitive admin auth settings for frontend UI display)
  app.get('/api/auth/config', (_req: Request, res: Response) => {
    return res.json({
      adminUsernameHint: ADMIN_USERNAME,
      adminEmailHint: ADMIN_EMAIL,
      authMethods: ['google', 'email_password'],
      hasSecurePasswordHash: Boolean(process.env.ADMIN_PASSWORD_HASH),
      securityStandard: 'Bcrypt-10 / HMAC-SHA256 Sessions'
    });
  });

  // -------------------------------------------------------------------------
  // Vite Integration (Development Middleware Mode or Production Static)
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Barozza Auth Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
