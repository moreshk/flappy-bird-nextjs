"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
  }
}

async function upsertPlayer(userData: UserData) {
  const { data, error } = await supabase
    .from('players')
    .upsert({
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      telegram_id: userData.id
    }, {
      onConflict: 'telegram_id'
    })
    .select();

  if (error) {
    console.error('Error upserting player:', error);
    throw error;
  } else {
    console.log('Player upserted successfully:', data);
    return data;
  }
}

export default function Home() {
  const scriptLoaded = useRef(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              
              // Upsert player data
              setIsLoading(true);
              setError(null);
              try {
                await upsertPlayer(user);
                debugMessages.push("Player data saved successfully");
              } catch (error) {
                console.error('Error upserting player:', error);
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
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }
  }, []);

  return (
    <main className="w-full h-screen flex items-center justify-center bg-black overflow-hidden">
      <canvas id="canvas" className="w-full h-full object-contain"></canvas>
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