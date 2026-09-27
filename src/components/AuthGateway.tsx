import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  KeyRound, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  Fingerprint, 
  ShieldAlert,
  Loader2
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

  // Form Fields
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
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
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingLock(false);
      });

    const unsub = subscribeToSingleUserLock((updatedLock) => {
      if (isMounted) {
        setLock(updatedLock);
        setIsLoadingLock(false);
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
      setErrorMessage(err?.message || "Failed to initialize ownership. Please check your credentials.");
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
      const res = await loginOwnerWithEmail({
        email: email.trim(),
        password
      });

      // Immediate 0ms login without waiting
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
        setErrorMessage("Don't try to Enter this, You're not an OWNER");
      } else {
        setErrorMessage(raw || "Don't try to Enter this, You're not an OWNER");
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
      // Immediate 0ms login without waiting
      onAuthenticated(res.user, res.lock);
    } catch (err: any) {
      console.error("Google auth error:", err);
      const raw = err?.message || "";
      if (raw.includes("popup-blocked")) {
        setErrorMessage("Google Sign-In popup was blocked by your browser. Please allow popups or use Email/Password.");
      } else if (raw.includes("cancelled") || raw.includes("closed-by-user")) {
        setErrorMessage("Authentication cancelled by user.");
      } else {
        setErrorMessage("Don't try to Enter this, You're not an OWNER");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInitialized = lock?.isInitialized ?? false;

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden transition-colors duration-500 ${
      isDarkMode ? 'bg-[#060a13] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Background Decorative Grid and Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#3730a3_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container with smooth fade-in */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-950/40 text-white mb-2 ring-4 ring-indigo-500/10">
            {/* Cafe Spoon Icon */}
            <svg 
              className="w-7 h-7 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2C8.5 2 6 4.8 6 8.5c0 3.2 2.2 5.8 5 6.4V21a1 1 0 0 0 2 0v-6.1c2.8-.6 5-3.2 5-6.4C18 4.8 15.5 2 12 2z" />
              <path d="M12 4.5c-1.8 0-3 1.8-3 4" strokeWidth="1.5" strokeOpacity="0.45" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center justify-center gap-2">
              <span>The Barozza Platform</span>
            </h1>
          </div>

          {/* Strict Single-User Status Ribbon */}
          <div className="pt-2 flex justify-center">
            {isLoadingLock ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking System Security Protocol...</span>
              </div>
            ) : isInitialized ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-950/70 text-rose-300 border border-rose-800/80 shadow-xs">
                <Lock className="w-3 h-3 text-rose-400" />
                <span>Single-User Locked • Registration Closed</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-950/70 text-indigo-300 border border-indigo-700/80 shadow-xs animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Initial Setup Mode • Awaiting First Owner</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Component */}
        <div className={`rounded-3xl border shadow-2xl backdrop-blur-md p-6 sm:p-8 transition-all duration-300 ${
          isDarkMode 
            ? 'bg-slate-900/90 border-slate-800/80 shadow-black/60' 
            : 'bg-white border-slate-200/80 shadow-slate-200/60'
        }`}>
          
          {/* Card Header */}
          <div className="mb-6 border-b pb-4 border-slate-800/60">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center justify-between">
              <span>{isInitialized ? 'Platform Owner Sign-In' : 'Claim Initial Platform Ownership'}</span>
            </h2>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {successMessage}
              </div>
            </div>
          )}

          {/* Forms */}
          {isInitialized ? (
            /* ========================================================================= */
            /* 1. INITIALIZED MODE: STRICT OWNER LOGIN ONLY (Sign-up permanently hidden) */
            /* ========================================================================= */
            <form onSubmit={handleLoginOwner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-hidden transition font-mono ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Master Security Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs border outline-hidden transition ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Authenticate as System Owner</span>
                  </>
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className={`px-2 ${isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                    Or Verify Via Enterprise SSO
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 ${
                  isDarkMode 
                    ? 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700' 
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Verify Identity via Google OAuth</span>
              </button>
            </form>
          ) : (
            /* ========================================================================= */
            /* 2. UNINITIALIZED MODE: FIRST OWNER INITIALIZATION ONLY */
            /* ========================================================================= */
            <form onSubmit={handleRegisterOwner} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your legal first name"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-hidden transition ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your legal last name"
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Master Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., alex.turner@company.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-hidden transition font-mono ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Master Security Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create master passphrase (min. 8 characters)"
                    className={`w-full pl-9 pr-9 py-2 rounded-xl text-xs border outline-hidden transition ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/40 text-[11px] text-indigo-200 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Single-User Policy:</strong> Once this account is initialized, this system will lock permanently to this owner. No other users can register.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Establishing Master Ownership...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Initialize System & Claim Ownership</span>
                  </>
                )}
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className={`px-2 ${isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                    Or Initialize with Google Provider
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 ${
                  isDarkMode 
                    ? 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700' 
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Initialize Ownership via Google OAuth</span>
              </button>
            </form>
          )}
        </div>

        {/* Security Footer Details */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p className="text-[11px] opacity-75">
            The Brozza Console System Security • Enterprise Tier
          </p>
        </div>
      </div>
    </div>
  );
};
