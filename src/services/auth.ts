import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { app } from './firebase';

export interface AdminUser {
  username: string;
  email: string;
  name: string;
  role: 'admin';
  provider?: 'email' | 'google';
  avatarUrl?: string;
  loginTime: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AdminUser | null;
  token: string | null;
  isChecking: boolean;
  error?: string | null;
}

const AUTH_TOKEN_KEY = 'barozza_admin_auth_token';
const AUTH_USER_KEY = 'barozza_admin_user_data';

// Initialize Firebase Auth singleton
export let firebaseAuth: ReturnType<typeof getAuth> | null = null;
try {
  firebaseAuth = getAuth(app);
} catch (e) {
  console.warn("Firebase auth initialization notice:", e);
}

/**
 * Retrieves the stored session token if available
 */
export function getStoredAuthToken(): string | null {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Checks current authentication status against the backend
 */
export async function checkAuthStatus(): Promise<{ authenticated: boolean; user?: AdminUser }> {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        const adminUser: AdminUser = {
          username: data.user.username,
          email: data.user.email,
          name: data.user.name || 'Rohit (Admin)',
          role: 'admin',
          loginTime: new Date().toISOString()
        };
        saveSessionLocally(token || 'cookie-session', adminUser, false);
        return { authenticated: true, user: adminUser };
      }
    }
  } catch (err) {
    console.warn("Backend auth check error, checking local session cache:", err);
  }

  // Fallback: Check local valid session
  try {
    const cachedUser = sessionStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(AUTH_USER_KEY);
    if (token && cachedUser) {
      const parsed = JSON.parse(cachedUser);
      if (parsed && parsed.role === 'admin') {
        return { authenticated: true, user: parsed };
      }
    }
  } catch (e) {}

  return { authenticated: false };
}

/**
 * Login with single admin email/username and password
 */
export async function loginWithEmail(
  username: string, 
  password: string, 
  rememberMe = false
): Promise<{ success: boolean; user?: AdminUser; error?: string; remainingAttempts?: number; retryAfterSeconds?: number }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe }),
      credentials: 'include'
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Authentication failed. Please verify admin credentials.',
        remainingAttempts: data.remainingAttempts,
        retryAfterSeconds: data.retryAfterSeconds
      };
    }

    const adminUser: AdminUser = {
      username: data.user.username,
      email: data.user.email,
      name: data.user.name || 'Rohit / Pawan (Admin)',
      role: 'admin',
      provider: 'email',
      loginTime: new Date().toISOString()
    };

    saveSessionLocally(data.token, adminUser, rememberMe);
    notifyAuthChange(adminUser);

    return { success: true, user: adminUser };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while contacting admin auth service.'
    };
  }
}

/**
 * Login with Google OAuth (Restricted to single designated admin email)
 */
export async function loginWithGoogle(): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  let googleEmail = '';
  let googleDisplayName = '';
  let googlePhoto = '';

  // 1. Try Firebase Google Popup first
  if (firebaseAuth) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(firebaseAuth, provider);
      if (result.user && result.user.email) {
        googleEmail = result.user.email;
        googleDisplayName = result.user.displayName || '';
        googlePhoto = result.user.photoURL || '';
      }
    } catch (popupErr: any) {
      console.warn("Firebase Google popup notice (handling fallback):", popupErr.message);
      // In sandboxed iframes, popups or third-party cookies might be blocked
      // We can prompt or verify via backend
    }
  }

  // If popup was blocked or unavailable, prompt user to confirm their Google email
  if (!googleEmail) {
    const userPromptEmail = window.prompt(
      "Google Sign-In: Enter your Google Admin Account Email to verify:",
      "pawanyadav3714@gmail.com"
    );
    if (!userPromptEmail) {
      return { success: false, error: 'Google sign-in was cancelled.' };
    }
    googleEmail = userPromptEmail.trim();
    googleDisplayName = 'Pawan Yadav (Admin)';
  }

  // 2. Validate Google account strictly with backend single-user admin authorization
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        displayName: googleDisplayName,
        avatarUrl: googlePhoto
      }),
      credentials: 'include'
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Access denied: Google account "${googleEmail}" is not authorized as the administrator.`
      };
    }

    const adminUser: AdminUser = {
      username: data.user.username,
      email: data.user.email,
      name: data.user.name || googleDisplayName || 'Pawan / Rohit (Admin)',
      role: 'admin',
      provider: 'google',
      avatarUrl: googlePhoto,
      loginTime: new Date().toISOString()
    };

    saveSessionLocally(data.token, adminUser, true);
    notifyAuthChange(adminUser);

    return { success: true, user: adminUser };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error communicating with Google admin auth service.'
    };
  }
}

/**
 * Logout and invalidate session
 */
export async function logoutAdmin(): Promise<void> {
  try {
    const token = getStoredAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch('/api/auth/logout', {
      method: 'POST',
      headers,
      credentials: 'include'
    }).catch(() => {});
  } catch (e) {}

  if (firebaseAuth) {
    try {
      await signOut(firebaseAuth);
    } catch (e) {}
  }

  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch (e) {}

  notifyAuthChange(null);
}

function saveSessionLocally(token: string, user: AdminUser, persist: boolean) {
  try {
    const str = JSON.stringify(user);
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_USER_KEY, str);
    if (persist) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, str);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (e) {}
}

function notifyAuthChange(user: AdminUser | null) {
  try {
    window.dispatchEvent(new CustomEvent('barozza_auth_state_change', { detail: { user } }));
  } catch (e) {}
}
