"use client";

import { useEffect, useRef } from 'react';

export default function Home() {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = '/game.js';
      script.async = true;
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }

    return () => {
      // Clean up is not needed as we're not removing the script
    };
  }, []);

  return (
    <main className="w-full h-screen flex items-center justify-center">
      <canvas id="canvas"></canvas>
    </main>
  );
}