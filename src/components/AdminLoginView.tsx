import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  KeyRound, 
  Sparkles, 
  Store, 
  Clock, 
  Info,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { loginWithEmail, loginWithGoogle, AdminUser } from '../services/auth';

interface AdminLoginViewProps {
  onLoginSuccess: (user: AdminUser) => void;
  onGoToCustomerDashboard: () => void;
  isDarkMode: boolean;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onGoToCustomerDashboard,
  isDarkMode
}) => {
  const [username, setUsername] = useState('pawanyadav3714@gmail.com');
  const [password, setPassword] = useState('Admin@Barozza2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [showHelpDetails, setShowHelpDetails] = useState(false);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    if (!username.trim()) {
      setErrorMessage('Please enter your admin username or email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your admin password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginWithEmail(username.trim(), password, rememberMe);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
        if (typeof result.remainingAttempts === 'number') {
          setRemainingAttempts(result.remainingAttempts);
        }
        if (result.retryAfterSeconds && result.retryAfterSeconds > 0) {
          setLockoutSeconds(result.retryAfterSeconds);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (lockoutSeconds > 0) return;
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginWithGoogle();
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Google authentication failed or was cancelled.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in encountered an error.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className={`min-h-[85vh] flex items-center justify-center p-4 sm:p-6 ${
      isDarkMode ? 'bg-[#0a0f1d] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className="w-full max-w-md space-y-6">
        {/* Brand & Security Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 text-white shadow-xl shadow-indigo-500/20 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Single-User Admin Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            The Barozza Console
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authorized admin access to orders, parcel dispatch, kitchen stock, and cafe status.
          </p>
        </div>

        {/* Lockout Banner */}
        {lockoutSeconds > 0 && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/60 text-white text-xs space-y-1.5 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Security Rate-Limit Active</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Too many failed login attempts detected. For protection against brute-force attacks, access is temporarily locked.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-amber-300 font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Retry permitted in: {lockoutSeconds} seconds</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && lockoutSeconds <= 0 && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-700/50 text-rose-200 text-xs flex items-start gap-2.5 shadow-md animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-300">{errorMessage}</p>
              {typeof remainingAttempts === 'number' && remainingAttempts > 0 && (
                <p className="text-[11px] text-slate-400 font-mono">
                  {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining before temporary lockout.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className={`p-6 sm:p-7 rounded-2xl border shadow-2xl space-y-6 ${
          isDarkMode 
            ? 'bg-slate-900/90 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
        }`}>
          {/* Method 1: Google Single-User OAuth */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading || lockoutSeconds > 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-3 transition shadow-sm cursor-pointer border ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white' 
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {/* Google G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Verifying Admin Google Account...' : 'Continue with Google (Admin)'}</span>
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Only the authorized admin Google account can pass authentication.
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className={`w-full border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`} />
            <span className={`absolute px-3 text-[11px] font-semibold uppercase tracking-wider ${
              isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'
            }`}>
              or sign in with password
            </span>
          </div>

          {/* Method 2: Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Admin Username or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="pawanyadav3714@gmail.com"
                  autoComplete="username"
                  required
                  disabled={isLoading || lockoutSeconds > 0}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-hidden transition ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Admin Password
                </label>
                <span className="text-[11px] text-indigo-400 font-mono font-semibold">
                  Bcrypt Hashed
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading || lockoutSeconds > 0}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs border outline-hidden transition ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <span>Keep admin session active</span>
              </label>

              <button
                type="button"
                onClick={() => setShowHelpDetails(!showHelpDetails)}
                className="text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition text-[11px]"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Credentials Help</span>
              </button>
            </div>

            {/* Help Drawer */}
            {showHelpDetails && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-2 text-slate-300 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Single Admin Architecture Note</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Per security rules, self-registration is strictly disabled. You can log in using either:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 font-mono text-[10px]">
                  <li>Google account: <strong className="text-white">pawanyadav3714@gmail.com</strong></li>
                  <li>Email: <strong className="text-white">pawanyadav3714@gmail.com</strong></li>
                  <li>Default Admin Pass: <strong className="text-emerald-400">Admin@Barozza2026!</strong></li>
                </ul>
                <p className="text-slate-500 text-[10px]">
                  To change admin credentials, configure <code className="text-slate-300 font-mono">ADMIN_USERNAME</code> and <code className="text-slate-300 font-mono">ADMIN_PASSWORD_HASH</code> in environment secrets.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading || lockoutSeconds > 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Bcrypt Hash...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Log In to Admin Console</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Public Storefront Navigation for Customers */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-400">
            Are you a customer wanting to order fresh food?
          </p>
          <button
            type="button"
            onClick={onGoToCustomerDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Open Customer Cafe Menu</span>
          </button>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secured with Bcrypt Hash, Rate-Limit Protection & Signed Sessions</span>
          </p>
          <p>© 2026 The Barozza Cafe • Single-User Restricted Admin Environment</p>
        </div>
      </div>
    </div>
  );
};
