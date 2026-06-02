import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  ShieldCheck
} from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { adminAPI } from "@food/api"

export default function PublicSupport() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    supportEmail: "switcheatsofficial@gmail.com",
    supportPhone: "8919142335",
    supportHours: "Merchant support is available from 8 AM to 12 AM, 7 days a week."
  })

  useEffect(() => {
    adminAPI.getPublicBusinessSettings()
      .then(res => {
        const data = res?.data?.data || res?.data
        if (data) {
          setSettings({
            supportEmail: data.supportEmail || "switcheatsofficial@gmail.com",
            supportPhone: data.supportPhone || "8919142335",
            supportHours: data.supportHours || "Merchant support is available from 8 AM to 12 AM, 7 days a week."
          })
        }
      })
      .catch(() => null)
  }, [])

  const faqs = [
    {
      question: "How to update menu prices?",
      answer: "You can update prices instantly through the 'Menu Management' section in your portal."
    },
    {
      question: "Delay in payout settlement?",
      answer: "Payouts are settled within 48 hours of order completion. Contact support for delays exceeding 3 days."
    },
    {
      question: "Technical issue with tablet?",
      answer: "Restart the app and check internet connectivity. If issue persists, call our technical helpline."
    }
  ]

  return (
    <AnimatedPage className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif]">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-50 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-gray-900 leading-tight">Help & Support</h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">Restaurant Partner Information</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        
        {/* Contact Cards */}
        <div className="space-y-4 mb-8">
          
          {/* Email Support Card */}
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50">
            <div className="w-12 h-12 border-2 border-[#DC2626] rounded-xl flex items-center justify-center mb-4 bg-red-50/50">
              <Mail className="h-5 w-5 text-[#DC2626]" />
            </div>
            <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-2">Merchant Support</h3>
            <a href={`mailto:${settings.supportEmail}`} className="text-[13px] font-medium text-gray-600 hover:text-[#DC2626] transition-colors mb-3">
              {settings.supportEmail}
            </a>
            <a href={`mailto:${settings.supportEmail}`} className="text-[10px] font-bold text-[#DC2626] uppercase tracking-widest">
              Email Support
            </a>
          </div>

          {/* Phone Support Card */}
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50">
            <div className="w-12 h-12 border-2 border-[#DC2626] rounded-xl flex items-center justify-center mb-4 bg-red-50/50">
              <Phone className="h-5 w-5 text-[#DC2626]" />
            </div>
            <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-2">Merchant Helpline</h3>
            <a href={`tel:${settings.supportPhone?.replace(/[^0-9+]/g, '')}`} className="text-[13px] font-medium text-gray-600 hover:text-[#DC2626] transition-colors mb-3">
              {settings.supportPhone}
            </a>
            <a href={`tel:${settings.supportPhone.replace(/[^0-9+]/g, '')}`} className="text-[10px] font-bold text-[#DC2626] uppercase tracking-widest">
              Instant Call
            </a>
          </div>

        </div>



        {/* FAQs */}
        <div className="mb-8">
          <h2 className="text-[17px] font-bold text-gray-900 mb-6">Merchant FAQs</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <MessageSquare className="h-[18px] w-[18px] text-[#DC2626]" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-gray-900 mb-1">{faq.question}</h4>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-3 mb-12">
          
          <div className="bg-white rounded-xl p-4 flex gap-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50">
            <div className="flex-shrink-0 mt-0.5">
              <Clock className="h-[18px] w-[18px] text-[#DC2626]" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1">Business Hours</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">{settings.supportHours}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 flex gap-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-50">
            <div className="flex-shrink-0 mt-0.5">
              <ShieldCheck className="h-[18px] w-[18px] text-[#DC2626]" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-1">Secure Support</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">Our support staff will never ask for your password or financial credentials.</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-1">Last Updated: June 2, 2026</p>
          <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">&copy; 2026 Switcheats. All Rights Reserved.</p>
        </div>

      </div>
    </AnimatedPage>
  )
}
