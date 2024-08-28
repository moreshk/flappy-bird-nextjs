// dummy
"use client";

import { useEffect, useState, useCallback } from 'react';
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

export default function Upgrade() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [earnRate, setEarnRate] = useState<number>(1);
  const [upgradeCost, setUpgradeCost] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const fetchPlayerStats = useCallback(async (telegramId: number) => {
    const { data, error } = await supabase
      .from('players')
      .select('total_score, earn_rate')
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      console.error('Error fetching player stats:', error);
    } else if (data) {
      setTotalScore(data.total_score);
      setEarnRate(data.earn_rate || 1);
      setUpgradeCost(calculateUpgradeCost(data.earn_rate || 1));
    }
  }, []);

  useEffect(() => {
    const checkTelegramObject = async () => {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const webApp = window.Telegram.WebApp;
        if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
          const user = webApp.initDataUnsafe.user as UserData;
          setUserData(user);
          fetchPlayerStats(user.id);
        }
      }
    };

    checkTelegramObject();
  }, [fetchPlayerStats]);

  const calculateUpgradeCost = (currentEarnRate: number) => {
    return currentEarnRate * 200;
  };

  const handleUpgrade = async () => {
    if (!userData) return;

    try {
      const { data, error } = await supabase.rpc('increase_earn_rate', {
        p_telegram_id: userData.id
      });

      if (error) throw error;

      setTotalScore(data.new_total_score);
      setEarnRate(data.new_earn_rate);
      setUpgradeCost(calculateUpgradeCost(data.new_earn_rate));
      setMessage('Upgrade successful!');

      // Fetch updated player stats
      await fetchPlayerStats(userData.id);
    } catch (error) {
      console.error('Error upgrading:', error);
      setMessage('Upgrade failed. Please try again.');
    }
  };

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-black text-white font-['Squada_One']">
      <h1 className="text-4xl mb-8">Upgrade Earn Rate</h1>
      <div className="flex items-center mb-4">
        <Image src="/mogul_coin.png" alt="Mogul Coin" width={40} height={40} />
        <span className="text-2xl ml-2">Total Score: {totalScore}</span>
      </div>
      <p className="text-xl mb-4">Current Earn Rate: {earnRate}</p>
      <p className="text-xl mb-4">Upgrade Cost: {upgradeCost}</p>
      <button
        className={`px-6 py-2 rounded text-xl ${
          totalScore >= upgradeCost
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-500 cursor-not-allowed'
        }`}
        onClick={handleUpgrade}
        disabled={totalScore < upgradeCost}
      >
        Upgrade
      </button>
      {message && <p className="mt-4 text-xl">{message}</p>}
      
    {/* Navigation icons */}
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