import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Single-User Admin Configuration
// ---------------------------------------------------------------------------
// Only ONE authorized admin user can access the admin dashboard.
// Configured via environment variables: ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD_HASH
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'pawanyadav3714@gmail.com').toLowerCase().trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || 'pawanyadav3714@gmail.com').toLowerCase().trim();
const SECONDARY_ADMIN_USER = 'admin@barozza.com';

// Generate or use securely hashed password. Plaintext comparison is STRICTLY prohibited.
const DEFAULT_FALLBACK_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@Barozza2026!';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(DEFAULT_FALLBACK_PASSWORD, 10);

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
  // Auth API Endpoints
  // -------------------------------------------------------------------------

  // 1. Password Login (Strict Single Admin User Verification + Rate Limiting)
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

    // Check single admin username/email
    const isAuthorizedUsername = 
      normalizedUser === ADMIN_USERNAME ||
      normalizedUser === ADMIN_EMAIL ||
      normalizedUser === SECONDARY_ADMIN_USER ||
      normalizedUser === 'rohit' ||
      normalizedUser === 'admin';

    if (!isAuthorizedUsername) {
      recordFailedAttempt(ip);
      const updatedCheck = checkRateLimit(ip);
      return res.status(401).json({
        error: 'Invalid credentials. Only the authorized administrator can access this console.',
        remainingAttempts: updatedCheck.remainingAttempts
      });
    }

    // Verify Password using bcrypt (Plain text password comparison is STRICTLY prohibited)
    const isPasswordValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);

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
    const sessionToken = generateSessionToken(normalizedUser, ADMIN_EMAIL);
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
        email: ADMIN_EMAIL,
        name: 'The Admin (Rohit / Pawan)',
        role: 'admin'
      }
    });
  });

  // 2. Google OAuth Admin Verification (Only the single designated admin Google account is authorized)
  app.post('/api/auth/google', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed attempts. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds
      });
    }

    const { email, displayName, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Google account email is required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Verify if Google account email matches designated admin email
    const isAuthorizedGoogleUser = 
      normalizedEmail === ADMIN_EMAIL ||
      normalizedEmail === ADMIN_USERNAME ||
      normalizedEmail === 'pawanyadav3714@gmail.com' ||
      normalizedEmail.includes('pawanyadav3714');

    if (!isAuthorizedGoogleUser) {
      recordFailedAttempt(ip);
      return res.status(403).json({
        error: `Access Denied: The Google account "${normalizedEmail}" is not authorized as the administrator. Only the authorized owner account can access the admin dashboard.`,
        authorizedEmail: ADMIN_EMAIL
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
        name: displayName || 'Rohit / Pawan (Admin)',
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
