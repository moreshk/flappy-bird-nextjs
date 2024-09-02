"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  allows_write_to_pm?: boolean;
}

interface ReferredUser {
  username: string;
}

export default function Referral() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [referralLink, setReferralLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);

  useEffect(() => {
    const checkTelegramObject = async () => {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const webApp = window.Telegram.WebApp;
        if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
          const user = webApp.initDataUnsafe.user as UserData;
          setUserData(user);
          
          if (user.username) {
            setReferralLink(`${process.env.NEXT_PUBLIC_BOT_BASE_URL}?startapp=${user.username}`);
            fetchReferredUsers(user.username);
          }
        }
      }
    };
  
    checkTelegramObject();
  }, []);

  const fetchReferredUsers = async (username: string) => {
    const { data: referrerData, error: referrerError } = await supabase
      .from('players')
      .select('telegram_id')
      .eq('username', username)
      .single();

    if (referrerError) {
      console.error('Error fetching referrer:', referrerError);
      return;
    }

    const { data, error } = await supabase
      .from('referrals')
      .select('players!referred_id(username)')
      .eq('referrer_id', referrerData.telegram_id);

    if (error) {
      console.error('Error fetching referred users:', error);
    } else {
      setReferredUsers(data.map((item: any) => ({ username: item.players.username })));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className="w-full min-h-screen flex flex-col items-center justify-center bg-black text-white font-['Squada_One'] p-4">
      <h1 className="text-4xl mb-8">Your Referral Link</h1>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mb-8">
        <p className="text-xl mb-4">Share this link with your friends:</p>
        <div className="bg-gray-700 p-3 rounded mb-3">
          <p className="text-sm font-mono break-all">{referralLink}</p>
        </div>
        <button
          onClick={copyToClipboard}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl mb-4">Users You Referred</h2>
        {referredUsers.length > 0 ? (
          <ul className="list-disc pl-5">
            {referredUsers.map((user, index) => (
              <li key={index} className="mb-2">{user.username}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">You have not referred any users yet.</p>
        )}
      </div>

      
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