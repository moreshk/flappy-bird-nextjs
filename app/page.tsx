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
  }
}

async function createPlayerWithReferral(userData: UserData, referralCode: string | null) {
  const { data, error } = await supabase
    .rpc('create_player_with_referral', {
      p_username: userData.username,
      p_first_name: userData.first_name,
      p_last_name: userData.last_name,
      p_telegram_id: userData.id,
      p_referral_code: referralCode
    });

  if (error) {
    console.error('Error creating player:', error);
    throw error;
  } else {
    console.log('Player created successfully:', data);
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
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('start');

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
    const checkTelegramObject = async () => {
      const debugMessages: string[] = [];

      if (window.Telegram) {
        debugMessages.push("Telegram object exists");
        if (window.Telegram.WebApp) {
          debugMessages.push("WebApp object exists");
          window.Telegram.WebApp.ready();
          const webApp = window.Telegram.WebApp;
          if (webApp.initDataUnsafe) {
            debugMessages.push("initDataUnsafe exists");
            if (webApp.initDataUnsafe.user) {
              debugMessages.push("User data exists");
              const user = webApp.initDataUnsafe.user as UserData;
              setUserData(user);
              debugMessages.push("User data retrieved successfully");
              
              // Create or update player data
              setIsLoading(true);
              setError(null);
              try {
                const result = await createPlayerWithReferral(user, referralCode);
                debugMessages.push("Player data saved successfully");
                if (result.bonus_applied) {
                  debugMessages.push("Referral bonus applied");
                }
                // Update the total score state if needed
                setTotalScore(prevScore => prevScore + (referralCode ? 1000 : 0));
                await fetchHighScore(user.id);
              } catch (error) {
                console.error('Error creating/updating player:', error);
                setError('Failed to save player data');
                debugMessages.push("Failed to save player data");
              } finally {
                setIsLoading(false);
              }
            } else {
              debugMessages.push("User data does not exist");
            }
          } else {
            debugMessages.push("initDataUnsafe does not exist");
          }
        } else {
          debugMessages.push("WebApp object does not exist");
        }
      } else {
        debugMessages.push("Telegram object does not exist");
        // If Telegram object doesn't exist, check again after a short delay
        setTimeout(checkTelegramObject, 100);
      }

      setDebugInfo(debugMessages);
    };

    checkTelegramObject();

    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = '/game.js';
      script.async = true;
      script.onload = () => {
        // Dispatch a custom event with the high score
        window.dispatchEvent(new CustomEvent('highScoreLoaded', { detail: highScore }));
      };
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }
  }, [highScore, referralCode]);

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-black overflow-hidden relative">
      <canvas id="canvas" className="w-full h-full object-contain"></canvas>
      {/* Upgrade icon */}
      <a href="/upgrade" className="absolute bottom-4 left-4 z-10">
        <Image
          src="/upgrade.png"
          alt="Upgrade"
          width={48}
          height={48}
        />
      </a>
      {/* Referral icon */}
      <a href="/referral" className="absolute bottom-4 right-4 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </a>
      {/* Debug info - controlled by environment variable */}
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