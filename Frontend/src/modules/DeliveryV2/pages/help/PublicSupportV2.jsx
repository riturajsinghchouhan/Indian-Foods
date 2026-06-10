import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, ShieldCheck } from 'lucide-react';
import logoNew from "@/assets/logo.png";

export const PublicSupportV2 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFF9F2] dark:bg-[#0a0a0a] flex flex-col font-['Poppins']">
      <div className="p-4 flex items-center gap-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all">
          <ArrowLeft className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Delivery Support</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-white shadow-lg overflow-hidden p-2 flex items-center justify-center border-4 border-white">
           <img src={logoNew} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Need Help?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          If you are facing issues with login or registration, please contact our support team.
        </p>

        <div className="w-full max-w-sm space-y-4">
          <a href="tel:+919876543210" className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Call Support</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Available 24/7 for urgent issues</p>
            </div>
          </a>

          <a href="mailto:support@theindianbite.com" className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Email Us</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">support@theindianbite.com</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};
