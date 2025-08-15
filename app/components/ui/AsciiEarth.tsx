'use client';

import { useEffect, useState } from 'react';

export default function AsciiEarth() {
    const [frame, setFrame] = useState(0);

    const earthFrames = [
        `
           ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
        ▄█████████████████████▄
       ████▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀████
      ████  ▄▄▄▄▄    ▄▄▄▄▄  ████
     ████  ███████  ███████  ████
     ████  ███████  ███████  ████
     ████  ▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀  ████
     ████                    ████
     ████  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  ████
     ████  ███████████████  ████
      ████  ▀▀▀▀▀▀▀▀▀▀▀▀▀  ████
       ████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄████
        ▀█████████████████████▀
           ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        `,
        `
           ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
        ▄█████████████████████▄
       ████▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀████
      ████    ▄▄▄▄▄▄▄▄▄▄    ████
     ████   ███████████████  ████
     ████   ███████████████  ████
     ████    ▀▀▀▀▀▀▀▀▀▀▀▀   ████
     ████                    ████
     ████   ▄▄▄▄▄    ▄▄▄▄▄  ████
     ████  ███████  ███████  ████
      ████  ▀▀▀▀▀▀  ▀▀▀▀▀▀  ████
       ████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄████
        ▀█████████████████████▀
           ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        `,
        `
           ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
        ▄█████████████████████▄
       ████▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀████
      ████      ▄▄▄▄▄▄      ████
     ████     ███████████    ████
     ████     ███████████    ████
     ████      ▀▀▀▀▀▀▀▀▀     ████
     ████  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  ████
     ████  ███████████████  ████
     ████  ███████████████  ████
      ████  ▀▀▀▀▀▀▀▀▀▀▀▀▀  ████
       ████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄████
        ▀█████████████████████▀
           ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        `,
        `
           ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
        ▄█████████████████████▄
       ████▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀████
      ████  ▄▄▄▄▄    ▄▄▄▄▄  ████
     ████  ███████  ███████  ████
     ████  ███████  ███████  ████
     ████  ▀▀▀▀▀▀▀  ▀▀▀▀▀▀▀  ████
     ████                    ████
     ████      ▄▄▄▄▄▄       ████
     ████    ███████████     ████
      ████    ▀▀▀▀▀▀▀▀▀     ████
       ████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄████
        ▀█████████████████████▀
           ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
        `
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(prev => (prev + 1) % earthFrames.length);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative">
            <pre className="font-mono text-primary/10 select-none text-xs sm:text-sm lg:text-base leading-tight">
                {earthFrames[frame]}
            </pre>
            
            {/* Add some particles/stars around the globe */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-8 w-1 h-1 bg-primary/20 rounded-full animate-pulse" />
                <div className="absolute top-12 right-10 w-1 h-1 bg-primary/15 rounded-full animate-pulse delay-75" />
                <div className="absolute bottom-8 left-12 w-1 h-1 bg-primary/20 rounded-full animate-pulse delay-150" />
                <div className="absolute bottom-16 right-8 w-1 h-1 bg-primary/15 rounded-full animate-pulse delay-300" />
                <div className="absolute top-20 left-4 w-0.5 h-0.5 bg-primary/10 rounded-full animate-pulse delay-500" />
                <div className="absolute bottom-4 right-16 w-0.5 h-0.5 bg-primary/10 rounded-full animate-pulse delay-700" />
            </div>
        </div>
    );
}