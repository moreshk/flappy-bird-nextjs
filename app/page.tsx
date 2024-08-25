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
    <main className="w-full h-screen flex items-center justify-center relative">
      <canvas id="canvas"></canvas>
      <div className="fixed top-0 left-0 bg-red-500 p-2 m-2 rounded shadow-md z-50">
        <p className="text-white">Debug: Always Visible</p>
      </div>
      {userData && (
        <div className="fixed top-10 left-0 bg-white bg-opacity-75 p-2 m-2 rounded shadow-md z-50">
          <p className="text-black font-bold">User: {userData.first_name} {userData.last_name}</p>
          <p className="text-black">ID: {userData.id}</p>
        </div>
      )}
    </main>
  );
}