import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Power, 
  Sparkles, 
  Lock, 
  Unlock, 
  Timer, 
  Info,
  ChevronRight
} from 'lucide-react';
import { CafeStatus } from '../types';

interface CafeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeStatus: CafeStatus;
  onUpdateCafeStatus: (status: CafeStatus) => Promise<void>;
  isDarkMode: boolean;
}

export const CafeStatusModal: React.FC<CafeStatusModalProps> = ({
  isOpen,
  onClose,
  cafeStatus,
  onUpdateCafeStatus,
  isDarkMode
}) => {
  // Compute default date & time (1 hour from now)
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5); // round to 5 min
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return { dateStr, timeStr };
  };

  const initial = getDefaultDateTime();
  const [selectedDate, setSelectedDate] = useState<string>(initial.dateStr);
  const [selectedTime, setSelectedTime] = useState<string>(initial.timeStr);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update live countdown if closed
  useEffect(() => {
    if (cafeStatus.isOpen || !cafeStatus.reopenTime) {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const target = new Date(cafeStatus.reopenTime).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Reopening momentarily...');
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [cafeStatus]);

  if (!isOpen) return null;

  // Format date-time for presentation
  const formatDateTimeDisplay = (dStr: string, tStr: string) => {
    try {
      const [year, month, day] = dStr.split('-').map(Number);
      const [hours, minutes] = tStr.split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hours, minutes);
      return dateObj.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return `${dStr} at ${tStr}`;
    }
  };

  // Quick Presets
  const applyPreset = (hoursToAdd: number, specificHour?: number, nextDay = false) => {
    const target = new Date();
    if (nextDay) {
      target.setDate(target.getDate() + 1);
    }
    if (typeof specificHour === 'number') {
      target.setHours(specificHour, 0, 0, 0);
    } else {
      target.setTime(target.getTime() + hoursToAdd * 60 * 60 * 1000);
    }
    const dStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    const tStr = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
    setSelectedDate(dStr);
    setSelectedTime(tStr);
  };

  const handleCloseCafe = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const reopenDateObj = new Date(year, month - 1, day, hours, minutes);
      const isoStr = reopenDateObj.toISOString();
      const formatted = formatDateTimeDisplay(selectedDate, selectedTime);

      const newStatus: CafeStatus = {
        isOpen: false,
        closedAt: new Date().toISOString(),
        reopenTime: isoStr,
        formattedReopenTime: formatted,
        closedBy: 'The Admin ( Rohit )',
        closureReason: `currently cafe is closed. so I'm sorry boss ! . it will open at ${formatted}`
      };

      await onUpdateCafeStatus(newStatus);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenEarly = async () => {
    setIsSubmitting(true);
    try {
      const newStatus: CafeStatus = {
        isOpen: true,
        reopenTime: '',
        formattedReopenTime: '',
        closedBy: 'The Admin ( Rohit )'
      };
      await onUpdateCafeStatus(newStatus);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          cafeStatus.isOpen 
            ? (isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200')
            : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              cafeStatus.isOpen 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {cafeStatus.isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                {cafeStatus.isOpen ? "Close Cafe & Pause Customer Orders" : "Cafe is Currently Closed"}
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {cafeStatus.isOpen 
                  ? "Turn on closure to show black & white UI and set opening date/time" 
                  : `Reopening scheduled for: ${cafeStatus.formattedReopenTime || 'Scheduled Time'}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Currently Closed Banner & Early Reopen Option */}
          {!cafeStatus.isOpen && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Active Closure</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-200 border border-rose-500/30">
                      Black & White Active
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-rose-100">
                    Customer dashboard is currently black & white. Orders are locked.
                  </p>
                  <p className="text-xs text-rose-300/80">
                    Scheduled Reopen: <strong className="text-white">{cafeStatus.formattedReopenTime}</strong>
                  </p>
                  {timeRemaining && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-rose-900/40">
                      <Timer className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-mono font-bold text-white">
                        Auto-opens in: {timeRemaining}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Instant Reopen Button (Off that feature / button as earliest) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReopenEarly}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/40 transition active:scale-[0.99] cursor-pointer"
                >
                  <Power className="w-4 h-4" />
                  <span>Open Cafe Early (Turn Off Closure Feature)</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-1.5">
                  Clicking this will immediately restore full colors and allow customers to order parcels right away.
                </p>
              </div>
            </div>
          )}

          {/* Configuration Form for Closing Cafe */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{cafeStatus.isOpen ? "Set Opening Date & Time" : "Change Scheduled Reopen Time"}</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Auto-reopens at this exact moment</span>
            </div>

            {/* Date & Time Picker Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Opening Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={minDate}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border transition ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                    } outline-hidden`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Opening Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border transition ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                    } outline-hidden`}
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(0.5)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  +30 min
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(1)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  +1 hr
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(2)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  +2 hrs
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(0, 21, false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Tonight 9:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(0, 9, true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Tomorrow 9:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(0, 11, true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Tomorrow 11:00 AM
                </button>
              </div>
            </div>

            {/* Interactive Alert Preview */}
            <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Info className="w-4 h-4" />
                <span>Customer Alert Preview on Ordering</span>
              </div>
              <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed">
                "currently cafe is closed. so I'm sorry boss ! . it will open at <span className="text-amber-300 font-bold underline">{formatDateTimeDisplay(selectedDate, selectedTime)}</span>."
              </div>
              <p className="text-[11px] text-slate-400">
                • Customer UI will display all dish orders in <strong>black and white</strong>.<br />
                • Ordering will be locked and show this alert when clicked.<br />
                • At the typed opening time, the system will <strong>automatically open</strong> the cafe.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!cafeStatus.isOpen && (
              <button
                type="button"
                onClick={handleReopenEarly}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Open Early</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCloseCafe}
              disabled={isSubmitting || !selectedDate || !selectedTime}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-md shadow-rose-950/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{cafeStatus.isOpen ? "Close Cafe Now" : "Update Reopen Time"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
