'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Loader2, Navigation, CheckCircle2 } from 'lucide-react';
import { useLocationStore, lookupPincode } from '@/lib/store';
import type { LocationData } from '@/lib/store';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
}

export function LocationModal({ open, onClose }: LocationModalProps) {
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<LocationData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const setLocation = useLocationStore((s) => s.setLocation);

  useEffect(() => {
    if (open) {
      setPincode('');
      setError('');
      setPreview(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleLookup = async (pin: string) => {
    const trimmed = pin.trim();
    if (!/^[1-9][0-9]{5}$/.test(trimmed)) {
      setError('Enter a valid 6-digit pincode');
      setPreview(null);
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const data = await lookupPincode(trimmed);
      setPreview(data);
    } catch {
      setError('Could not find this pincode. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      setLocation(preview);
      onClose();
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setError('');
    setPreview(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'User-Agent': 'Xelnova/1.0' } },
          );
          const data = await res.json();
          const postcode = data?.address?.postcode;

          if (postcode && /^[1-9][0-9]{5}$/.test(postcode)) {
            setPincode(postcode);
            const locationData = await lookupPincode(postcode);
            setLocation(locationData);
            onClose();
          } else {
            setError('Could not detect pincode from your location. Please enter manually.');
          }
        } catch {
          setError('Failed to detect location. Please enter pincode manually.');
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setError('Location access denied. Please enter pincode manually.');
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-[201] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
                  <MapPin size={18} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Choose your location</h2>
                  <p className="text-xs text-gray-500">For better delivery experience</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Detect location button */}
              <button
                onClick={handleGeolocate}
                disabled={geoLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 px-4 py-3 text-sm font-medium text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all disabled:opacity-60"
              >
                {geoLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Navigation size={16} />
                )}
                {geoLoading ? 'Detecting...' : 'Detect my location'}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-400 uppercase">or enter pincode</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Pincode input */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPincode(val);
                    setError('');
                    setPreview(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLookup(pincode);
                  }}
                  placeholder="Enter 6-digit pincode"
                  className="h-11 flex-1 rounded-xl border-2 border-gray-200 px-4 text-sm outline-none transition-colors focus:border-primary-500 placeholder:text-gray-400"
                />
                <button
                  onClick={() => handleLookup(pincode)}
                  disabled={loading || pincode.length < 6}
                  className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Check'}
                </button>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              {/* Preview result */}
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-green-200 bg-green-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {preview.city}, {preview.district}
                      </p>
                      <p className="text-xs text-gray-600">
                        {preview.state} — {preview.pincode}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleConfirm}
                    className="mt-3 w-full rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Deliver here
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
