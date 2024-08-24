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
    <main className="flex flex-col items-center justify-center min-h-screen w-full">
      <canvas id="canvas" className="w-full h-auto max-w-[414px] max-h-[736px]"></canvas>
    </main>
  );
}