"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Image from 'next/image';

interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  allows_write_to_pm?: boolean;
}

export default function Referral() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkTelegramObject = async () => {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const webApp = window.Telegram.WebApp;
        if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
          const user = webApp.initDataUnsafe.user as UserData;
          setUserData(user);
          // Generate a simple referral code based on user ID
          const code = `MEMECOIN${user.id}`;
          setReferralCode(code);
          // Generate the referral link
          setReferralLink(`https://t.me/memecoinmogul_bot?start=${code}`);
        }
      }
    };

    checkTelegramObject();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className="w-full min-h-screen flex flex-col items-center justify-center bg-black text-white font-['Squada_One'] p-4">
      <h1 className="text-4xl mb-8">Your Referral Link</h1>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <p className="text-xl mb-4">Share this link with your friends:</p>
        <div className="flex items-center justify-between bg-gray-700 p-3 rounded">
          <span className="text-sm font-bold break-all mr-2">{referralLink}</span>
          <button
            onClick={copyToClipboard}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <p className="mt-6 text-center text-gray-400">
        Invite friends to join MemeCoinMogul and earn rewards!
      </p>
      
      {/* Navigation icon */}
      <div className="absolute bottom-4 left-4">
        <a href="/" className="text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </a>
      </div>
    </main>
  );
}