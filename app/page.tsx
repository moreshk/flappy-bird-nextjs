"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

// Define the interface for user data
interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  allows_write_to_pm?: boolean;
}

declare global {
  interface Window {
    Telegram: any;
    upsertPlayer: (score: number) => Promise<void>;
    totalScore: number;
  }
}

async function createPlayerWithReferral(userData: UserData, referralCode: string | null, addDebugMessage: (message: string) => void) {
  addDebugMessage(`Creating player with referral code: ${referralCode}`);
  addDebugMessage(`User data: ${JSON.stringify(userData)}`);

  const { data, error } = await supabase
    .rpc('create_player_with_referral', {
      p_username: userData.username,
      p_first_name: userData.first_name,
      p_last_name: userData.last_name,
      p_telegram_id: userData.id,
      p_referral_code: referralCode
    });

  if (error) {
    addDebugMessage(`Error creating player: ${error.message}`);
    throw error;
  } else {
    addDebugMessage(`Player created successfully: ${JSON.stringify(data)}`);
    return data;
  }
}

async function updatePlayerScores(telegramId: number, score: number) {
  const { data, error } = await supabase
    .rpc('update_player_scores', {
      p_telegram_id: telegramId,
      p_score: score
    });

  if (error) {
    console.error('Error updating player scores:', error);
    throw error;
  } else {
    console.log('Player scores updated successfully:', data);
    return data;
  }
}

function ClientHome() {
  const scriptLoaded = useRef(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highScore, setHighScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  const searchParams = useSearchParams();

  const addDebugMessage = useCallback((message: string) => {
    setDebugInfo(prev => [...prev, message]);
  }, []);

  const fetchHighScore = async (telegramId: number) => {
    const { data, error } = await supabase
      .from('players')
      .select('high_score, total_score, attempts_count, earn_rate')
      .eq('telegram_id', telegramId)
      .single();
  
    if (error) {
      console.error('Error fetching high score:', error);
    } else if (data) {
      setHighScore(data.high_score);
      setTotalScore(data.total_score);
      window.dispatchEvent(new CustomEvent('highScoreUpdated', { detail: data.high_score }));
      window.dispatchEvent(new CustomEvent('statsUpdated', { 
        detail: {
          total_score: data.total_score,
          attempts_count: data.attempts_count,
          earn_rate: data.earn_rate || 1
        }
      }));
    }
  };

  async function handlePlayerUpdate(userData: UserData, score: number) {
    try {
      await updatePlayerScores(userData.id, score);
      setTotalScore(prevTotal => prevTotal + score);
    } catch (error) {
      console.error('Error updating player data:', error);
    }
  }

  useEffect(() => {
    window.totalScore = totalScore;
  }, [totalScore]);

  useEffect(() => {
    if (userData) {
      window.upsertPlayer = async (score: number) => {
        try {
          await handlePlayerUpdate(userData, score);
          await fetchHighScore(userData.id);
        } catch (error) {
          console.error('Error updating player data:', error);
        }
      };
      fetchHighScore(userData.id);
    }
  }, [userData]);

  useEffect(() => {
    addDebugMessage(`Full URL: ${window.location.href}`);
    addDebugMessage(`Search params: ${window.location.search}`);
    addDebugMessage(`Hash: ${window.location.hash}`);

    const getReferralCode = () => {
      const sources = [
        { name: 'URL tgWebAppStartParam', value: searchParams.get('tgWebAppStartParam') },
        { name: 'URL startapp', value: searchParams.get('startapp') },
        { name: 'Telegram WebApp', value: window.Telegram?.WebApp?.initDataUnsafe?.start_param },
        { name: 'Hash tgWebAppStartParam', value: new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppStartParam') },
        { name: 'Hash start_param', value: new URLSearchParams(window.location.hash.slice(1)).get('start_param') },
      ];

      for (const source of sources) {
        addDebugMessage(`Checking ${source.name}: ${source.value || 'Not found'}`);
        if (source.value) return source.value;
      }

      return null;
    };

    const code = getReferralCode();
    addDebugMessage(`Final referral code: ${code || 'None'}`);
    setReferralCode(code);

    const checkTelegramObject = async () => {
      if (window.Telegram) {
        addDebugMessage("Telegram object exists");
        if (window.Telegram.WebApp) {
          addDebugMessage("WebApp object exists");
          window.Telegram.WebApp.ready();
          const webApp = window.Telegram.WebApp;
          if (webApp.initDataUnsafe) {
            addDebugMessage("initDataUnsafe exists");
            addDebugMessage(`initDataUnsafe: ${JSON.stringify(webApp.initDataUnsafe)}`);
            if (webApp.initDataUnsafe.user) {
              addDebugMessage("User data exists");
              const user = webApp.initDataUnsafe.user as UserData;
              setUserData(user);
              addDebugMessage("User data retrieved successfully");
              
              setIsLoading(true);
              setError(null);

              try {
                addDebugMessage(`Attempting to create player with referral code: ${code}`);
                const result = await createPlayerWithReferral(user, code, addDebugMessage);
                addDebugMessage("Player data saved successfully");
                if (result.bonus_applied) {
                  addDebugMessage("Referral bonus applied");
                }
                setTotalScore(prevScore => prevScore + (code ? 1000 : 0));
                await fetchHighScore(user.id);
              } catch (error) {
                console.error('Error creating/updating player:', error);
                setError('Failed to save player data');
                addDebugMessage("Failed to save player data");
              } finally {
                setIsLoading(false);
              }
            } else {
              addDebugMessage("User data does not exist");
            }
          } else {
            addDebugMessage("initDataUnsafe does not exist");
          }
        } else {
          addDebugMessage("WebApp object does not exist");
        }
      } else {
        addDebugMessage("Telegram object does not exist");
        setTimeout(checkTelegramObject, 100);
      }
    };

    checkTelegramObject();

    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = '/game.js';
      script.async = true;
      script.onload = () => {
        window.dispatchEvent(new CustomEvent('highScoreLoaded', { detail: highScore }));
      };
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }
  }, [highScore, searchParams, addDebugMessage]);

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-black overflow-hidden relative">
      <canvas id="canvas" className="w-full h-full object-contain"></canvas>
      <a href="/upgrade" className="absolute bottom-4 left-4 z-10">
        <Image
          src="/upgrade.png"
          alt="Upgrade"
          width={48}
          height={48}
        />
      </a>
      <a href="/referral" className="absolute bottom-4 right-4 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </a>
      {process.env.NEXT_PUBLIC_SHOW_DEBUG === 'true' && (
        <div className="fixed top-0 left-0 bg-red-500 p-2 m-2 rounded shadow-md z-50 max-w-xs overflow-auto max-h-screen">
          <p className="text-white font-bold">Debug Info:</p>
          {debugInfo.map((message, index) => (
            <p key={index} className="text-white text-sm">{message}</p>
          ))}
          {isLoading && <p className="text-white text-sm">Saving player data...</p>}
          {error && <p className="text-white text-sm bg-red-700 p-1 rounded">{error}</p>}
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientHome />
    </Suspense>
  );
}