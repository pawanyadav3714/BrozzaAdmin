import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Fingerprint, 
  ShieldAlert,
  Loader2,
  Check
} from 'lucide-react';
import { 
  SingleUserLock, 
  AuthOwnerUser, 
  getSingleUserLock, 
  subscribeToSingleUserLock, 
  registerFirstOwnerWithEmail, 
  loginOwnerWithEmail, 
  authenticateWithGoogle 
} from '../services/firebase';

interface AuthGatewayProps {
  onAuthenticated: (user: AuthOwnerUser, lock: SingleUserLock) => void;
  isDarkMode: boolean;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onAuthenticated, isDarkMode }) => {
  const [lock, setLock] = useState<SingleUserLock | null>(null);
  const [isLoadingLock, setIsLoadingLock] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'signup' | 'signin'>('signin');

  // Form Fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('pawanyadav3714@gmail.com');
  const [password, setPassword] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Initial lock retrieval and subscription
  useEffect(() => {
    let isMounted = true;
    getSingleUserLock()
      .then((l) => {
        if (isMounted) {
          setLock(l);
          setIsLoadingLock(false);
          if (!l.isInitialized) {
            setActiveMode('signup');
          } else {
            setActiveMode('signin');
            if (l.ownerEmail) {
              setEmail(l.ownerEmail);
            }
          }
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingLock(false);
      });

    const unsub = subscribeToSingleUserLock((updatedLock) => {
      if (isMounted) {
        setLock(updatedLock);
        setIsLoadingLock(false);
        if (!updatedLock.isInitialized) {
          setActiveMode('signup');
        } else {
          setActiveMode('signin');
          if (updatedLock.ownerEmail) {
            setEmail(updatedLock.ownerEmail);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Handle Email Registration (Only when uninitialized)
  const handleRegisterOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (lock?.isInitialized) {
      setErrorMessage("Registration is closed. System initialized.");
      return;
    }

    if (!firstName.trim()) {
      setErrorMessage("Legal first name is required.");
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage("Legal last name is required.");
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage("Please enter a valid official email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Security passphrase must contain at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Also notify backend server
      fetch('/api/auth/register-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password
        })
      }).catch(() => {});

      // 2. Client-side single user lock & Firebase Auth
      const res = await registerFirstOwnerWithEmail({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password
      });

      setLock(res.lock);
      setSuccessMessage("System ownership claimed successfully! Initializing secure console...");
      onAuthenticated(res.user, res.lock);
    } catch (err: any) {
      console.error("Owner registration error:", err);
      const raw = err?.message || "";
      if (raw.includes("closed") || raw.includes("initialized") || raw.includes("OWNER")) {
        setErrorMessage("Registration is closed. System initialized.");
      } else {
        setErrorMessage(raw || "Failed to initialize ownership. Please check your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Email Login (When initialized)
  const handleLoginOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Administrator email is required.");
      return;
    }
    if (!password) {
      setErrorMessage("Master passphrase is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Attempt backend session sync
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email.trim(),
          password,
          rememberMe: true
        })
      }).catch(() => {});

      const res = await loginOwnerWithEmail({
        email: email.trim(),
        password
      });

      onAuthenticated(res.user, res.lock);
    } catch (err: any) {
      console.error("Owner login error:", err);
      const raw = err?.message || "";
      if (
        raw.includes("not an OWNER") ||
        raw.includes("Access Denied") ||
        raw.includes("Registration is closed") ||
        raw.includes("locked to") ||
        raw.includes("user-not-found") ||
        raw.includes("wrong-password") ||
        raw.includes("invalid-credential")
      ) {
        setErrorMessage("Registration is closed. System initialized.");
      } else {
        setErrorMessage(raw || "Registration is closed. System initialized.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Auth (OAuth)
  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await authenticateWithGoogle();
      if (!lock?.isInitialized) {
        setLock(res.lock);
      }

      // Sync backend session
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: res.user.email,
          displayName: res.user.displayName
        })
      }).catch(() => {});

      onAuthenticated(res.user, res.lock);
    } catch (err: any) {
      console.error("Google auth error:", err);
      const raw = err?.message || "";
      if (raw.includes("popup-blocked")) {
        setErrorMessage("Google Sign-In popup was blocked by your browser. Please allow popups or use Email/Password.");
      } else if (raw.includes("cancelled") || raw.includes("closed-by-user")) {
        setErrorMessage("Authentication cancelled by user.");
      } else {
        setErrorMessage("Registration is closed. System initialized.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInitialized = lock?.isInitialized ?? false;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden transition-all duration-500">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-600/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Container with smooth fade/slide transition */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Top Floating Badge Accent: Glowing "Secure Auth" / "Single Admin Sync" */}
        <div className="text-center mb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300 shadow-xl shadow-black/40 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              {isInitialized ? 'Single Admin Sync' : 'Secure Auth'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
              {isInitialized ? 'Locked (1/1)' : 'Awaiting Owner'}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>The Barozza Platform</span>
            </h1>
            <p className="text-xs text-slate-400">
              {isInitialized
                ? 'Authorized Administrator Authentication Console'
                : 'Initial Platform Onboarding & Master Ownership Setup'}
            </p>
          </div>
        </div>

        {/* Card Component: Rounded-2xl with subtle translucent border matching reference */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 shadow-2xl shadow-black/80 backdrop-blur-xl p-6 sm:p-7 relative transition-all duration-300">
          
          {/* Card Header & Badge */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {activeMode === 'signup' ? 'First-Time Sign-Up' : 'Administrator Sign-In'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeMode === 'signup' 
                  ? 'The very first user becomes the permanent platform owner.' 
                  : 'Enter authorized owner credentials to access the console.'}
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5 shrink-0 text-[10px] font-mono font-bold text-slate-300">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Single-User</span>
            </div>
          </div>

          {/* Feedback Error / Success Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {successMessage}
              </div>
            </div>
          )}

          {/* Form Options */}
          {activeMode === 'signup' ? (
            /* ========================================================================= */
            /* 1. FIRST-TIME SIGN-UP FORM: First Name, Last Name, Email, Password        */
            /* ========================================================================= */
            <form onSubmit={handleRegisterOwner} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 tracking-wider uppercase">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your legal first name"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 tracking-wider uppercase">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your legal last name"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 tracking-wider uppercase">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., alex.turner@company.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 tracking-wider uppercase">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create strong security passphrase"
                    className="w-full pl-9 pr-9 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-200/90 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Single-User Policy:</strong> Once registered, all subsequent sign-ups will be locked immediately.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Permanent Owner...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Complete Onboarding & Claim Ownership</span>
                  </>
                )}
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="px-2 bg-[#0f172a] text-slate-500">
                    Or Continue With OAuth
                  </span>
                </div>
              </div>

              {/* Alternative Option: "Continue with Google" OAuth button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {isInitialized && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('signin');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition cursor-pointer"
                  >
                    Already initialized? Sign in as Owner →
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* ========================================================================= */
            /* 2. SIGN-IN MODE: STRICT SINGLE-OWNER LOGIN                                */
            /* ========================================================================= */
            <form onSubmit={handleLoginOwner} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 tracking-wider uppercase">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., alex.turner@company.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 tracking-wider uppercase">
                  Master Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create strong security passphrase"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Owner Credentials...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Authenticate as Owner</span>
                  </>
                )}
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="px-2 bg-[#0f172a] text-slate-500">
                    Or Verify With Google OAuth
                  </span>
                </div>
              </div>

              {/* Alternative Option: "Continue with Google" OAuth button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isInitialized) {
                      setErrorMessage("Registration is closed. System initialized.");
                    } else {
                      setActiveMode('signup');
                      setErrorMessage(null);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-slate-300 font-medium transition cursor-pointer"
                >
                  Need to register a new account?
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Footer Details */}
        <div className="mt-5 text-center text-xs text-slate-500">
          <p className="text-[11px] opacity-75">
            Single-User Protected Platform • Enterprise Security
          </p>
        </div>
      </div>
    </div>
  );
};
