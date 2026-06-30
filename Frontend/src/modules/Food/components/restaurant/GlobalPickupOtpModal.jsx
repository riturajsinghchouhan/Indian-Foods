import React from 'react';
import { useRestaurantNotifications } from '@food/hooks/useRestaurantNotifications';
import RestaurantModal from './RestaurantModal';

export default function GlobalPickupOtpModal() {
  const { pickupOtpReveal, clearPickupOtpReveal } = useRestaurantNotifications();

  return (
    <RestaurantModal
      open={Boolean(pickupOtpReveal)}
      onClose={clearPickupOtpReveal}
      size="sm"
      showClose={false}
    >
      <div className="flex flex-col items-center text-center -mt-2">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
          <span className="text-2xl">🛵</span>
        </div>
        <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Delivery Partner Arrived</p>
        <p className="text-[13px] text-gray-500 font-medium mb-5">
          Share this OTP with the delivery partner for Order #{pickupOtpReveal?.orderId || ''}
        </p>
        <div className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-2xl py-4 px-6 mb-5">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Pickup Verification OTP</p>
          <p className="text-4xl font-black text-emerald-800 tracking-[0.3em]">{pickupOtpReveal?.otp}</p>
        </div>
        <p className="text-[11px] text-gray-400 font-medium mb-4">Tell this code to the delivery partner so they can complete the pickup.</p>
        <button
          onClick={clearPickupOtpReveal}
          className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm"
        >
          Got it
        </button>
      </div>
    </RestaurantModal>
  );
}
