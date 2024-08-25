"use client";

import { useEffect, useRef, useState } from 'react';

// Define the interface for user data
interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
}

declare global {
  interface Window {
    Telegram: any;
  }
}

export default function Home() {
  const scriptLoaded = useRef(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    // Tell Telegram that the Mini App is ready
    window.Telegram?.WebApp?.ready();

    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = '/game.js';
      script.async = true;
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }

    // Add debug information
    const debugMessages: string[] = [];

    if (window.Telegram) {
      debugMessages.push("Telegram object exists");
      if (window.Telegram.WebApp) {
        debugMessages.push("WebApp object exists");
        const webApp = window.Telegram.WebApp;
        if (webApp.initDataUnsafe) {
          debugMessages.push("initDataUnsafe exists");
          if (webApp.initDataUnsafe.user) {
            debugMessages.push("User data exists");
            const user = webApp.initDataUnsafe.user as UserData;
            setUserData(user);
            debugMessages.push(`User data: ${JSON.stringify(user)}`);
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
    }

    setDebugInfo(debugMessages);

  }, []);

  return (
    <main className="w-full h-screen flex items-center justify-center relative">
      <canvas id="canvas"></canvas>
      <div className="fixed top-0 left-0 bg-red-500 p-2 m-2 rounded shadow-md z-50 max-w-xs overflow-auto max-h-screen">
        <p className="text-white font-bold">Debug Info:</p>
        {debugInfo.map((message, index) => (
          <p key={index} className="text-white text-sm">{message}</p>
        ))}
      </div>
      {userData && (
        <div className="fixed top-10 right-0 bg-white bg-opacity-75 p-2 m-2 rounded shadow-md z-50">
          <p className="text-black font-bold">User: {userData.first_name} {userData.last_name}</p>
          <p className="text-black">ID: {userData.id}</p>
        </div>
      )}
    </main>
  );
}