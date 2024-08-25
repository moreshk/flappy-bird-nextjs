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

  useEffect(() => {
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = '/game.js';
      script.async = true;
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }

    // Check for Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      const webApp = window.Telegram.WebApp;
      if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
        const user = webApp.initDataUnsafe.user as UserData;
        setUserData(user);
        console.log('Telegram User Data:', user);
      }
    }

    return () => {
      // Clean up is not needed as we're not removing the script
    };
  }, []);

  return (
    <main className="w-full h-screen flex items-center justify-center">
      <canvas id="canvas"></canvas>
      {userData && (
        <div className="absolute top-0 left-0 bg-white bg-opacity-50 p-2 m-2 rounded">
          <p>User: {userData.first_name} {userData.last_name}</p>
          <p>ID: {userData.id}</p>
        </div>
      )}
    </main>
  );
}