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
    <main className="flex justify-center items-center min-h-screen">
      <canvas id="canvas" width="276" height="414"></canvas>
    </main>
  );
}