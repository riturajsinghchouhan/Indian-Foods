import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MessageSquare, Clock } from 'lucide-react';

export const PublicSupportV2 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#121212] flex flex-col font-['Inter',sans-serif]">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-4 bg-white dark:bg-[#1a1a1a] sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-[#1A2642] dark:text-gray-200" strokeWidth={2.5} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[19px] font-bold text-[#1A2642] dark:text-white leading-tight">Help & Support</h1>
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">DELIVERY PARTNER INFORMATION</span>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 max-w-lg w-full mx-auto pb-8">
        
        {/* Email Support Card */}
        <a href="mailto:support@theindianbite.com" className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-[18px] border-[1.5px] border-[#E53935] flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-[#E53935]" strokeWidth={2} />
          </div>
          <h3 className="text-[13px] font-bold text-[#1A2642] dark:text-gray-200 tracking-wider mb-1.5 uppercase">DELIVERY SUPPORT</h3>
          <p className="text-[15px] text-[#2c3e50] dark:text-gray-400 font-medium mb-3">support@theindianbite.com</p>
          <span className="text-[#E53935] text-[11px] font-bold tracking-wider uppercase">EMAIL SUPPORT</span>
        </a>

        {/* Phone Support Card */}
        <a href="tel:+918882236180" className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-[18px] border-[1.5px] border-[#E53935] flex items-center justify-center mb-4">
            <Phone className="w-6 h-6 text-[#E53935]" strokeWidth={2} />
          </div>
          <h3 className="text-[13px] font-bold text-[#1A2642] dark:text-gray-200 tracking-wider mb-1.5 uppercase">DELIVERY HELPLINE</h3>
          <p className="text-[15px] text-[#2c3e50] dark:text-gray-400 font-medium mb-3">8882236180</p>
          <span className="text-[#E53935] text-[11px] font-bold tracking-wider uppercase">INSTANT CALL</span>
        </a>

        {/* FAQs Section */}
        <div className="mt-4">
          <h2 className="text-lg font-bold text-[#1A2642] dark:text-white mb-5 px-1">Delivery FAQs</h2>
          
          <div className="space-y-6 px-1">
            <div className="flex gap-4">
              <MessageSquare className="w-5 h-5 text-[#E53935] shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <h4 className="text-[15px] font-bold text-[#1A2642] dark:text-gray-200 mb-1.5">How to resolve login issues?</h4>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">Ensure you're using the correct registered mobile number. If the issue persists, contact our helpline for an instant OTP reset.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <MessageSquare className="w-5 h-5 text-[#E53935] shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <h4 className="text-[15px] font-bold text-[#1A2642] dark:text-gray-200 mb-1.5">Delay in payout settlement?</h4>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">Payouts are settled according to your active withdrawal cycle. Contact support for delays exceeding 48 hours.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <MessageSquare className="w-5 h-5 text-[#E53935] shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <h4 className="text-[15px] font-bold text-[#1A2642] dark:text-gray-200 mb-1.5">Technical issue with app?</h4>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">Restart the app and check internet connectivity. Make sure your app is updated to the latest version.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="mt-4 bg-white dark:bg-[#1a1a1a] rounded-[20px] p-5 flex gap-4 shadow-sm items-start">
          <Clock className="w-5 h-5 text-[#E53935] shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <h4 className="text-[12px] font-bold text-[#1A2642] dark:text-gray-200 uppercase tracking-wider mb-1.5">BUSINESS HOURS</h4>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">Delivery support is available from 8 AM to 12 AM, 7 days a week.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
