'use client';

import { useEffect, useState, useRef } from 'react';

export default function RotatingAsciiGlobe() {
    const [frame, setFrame] = useState(0);
    const requestRef = useRef<number | null>(null);

    // Create a more realistic rotating globe with proper ASCII shading
    const generateGlobe = (rotation: number) => {
        const radius = 20; // Bigger radius for more detail
        const aspectRatio = 2.2; // Characters are taller than wide
        const lightSource = { x: -0.5, y: 0.5, z: 0.7 }; // Light coming from upper left

        // More detailed ASCII characters for better gradients
        const shading = ' .·:¸‚„;:=+≈≠*■▪▫●○◉◊◈◆◇□▢▣▤▥▦▧▨▩█';

        let globe = [];

        for (let y = -radius; y <= radius; y++) {
            let line = '';
            for (let x = -radius * aspectRatio; x <= radius * aspectRatio; x++) {
                const adjustedX = x / aspectRatio;

                // Check if we're inside the circle
                const distanceFromCenter = Math.sqrt(adjustedX * adjustedX + y * y);

                if (distanceFromCenter <= radius) {
                    // Calculate 3D position on sphere
                    const z = Math.sqrt(radius * radius - adjustedX * adjustedX - y * y);

                    // Normalize to unit sphere
                    const nx = adjustedX / radius;
                    const ny = y / radius;
                    const nz = z / radius;

                    // Calculate longitude for texture mapping (rotation effect)
                    const longitude = Math.atan2(nx, nz) + rotation;

                    // Simple continent pattern based on longitude and latitude
                    const latitude = Math.asin(ny);

                    // Create more detailed continent patterns
                    const continentPattern =
                        Math.sin(longitude * 2) * Math.cos(latitude * 3) * 0.7 +
                        Math.sin(longitude * 3 + 1) * Math.cos(latitude * 2) * 0.5 +
                        Math.sin(longitude * 4 - 2) * Math.cos(latitude * 4) * 0.3 +
                        Math.sin(longitude * 5 + 0.5) * Math.cos(latitude * 5) * 0.2 +
                        Math.sin(longitude * 7) * Math.sin(latitude * 3 + 1) * 0.15 +
                        Math.cos(longitude * 6 - 1) * Math.sin(latitude * 2) * 0.1;

                    // Calculate lighting (dot product with light source)
                    const brightness = Math.max(0,
                        nx * lightSource.x +
                        ny * lightSource.y +
                        nz * lightSource.z
                    );

                    // Add texture noise for more detail
                    const noise = Math.sin(longitude * 20) * Math.cos(latitude * 20) * 0.05;

                    // Combine continent pattern with lighting
                    const isLand = continentPattern > 0.15;
                    const isCoast = Math.abs(continentPattern - 0.15) < 0.1;
                    const isMountain = continentPattern > 0.4 && Math.random() > 0.7;

                    let baseBrightness = brightness * 0.5;
                    if (isMountain) baseBrightness = brightness * 0.95;
                    else if (isLand) baseBrightness = brightness * 0.75;
                    else if (isCoast) baseBrightness = brightness * 0.65;

                    // Add edge darkening for sphere effect
                    const edgeFactor = 1 - Math.pow(distanceFromCenter / radius, 2) * 0.4;
                    const finalBrightness = (baseBrightness + noise) * edgeFactor;

                    // Map brightness to ASCII character
                    const charIndex = Math.floor(finalBrightness * (shading.length - 1));
                    line += shading[Math.max(0, Math.min(charIndex, shading.length - 1))];
                } else {
                    line += ' ';
                }
            }
            globe.push(line);
        }

        return globe.join('\n');
    };

    useEffect(() => {
        let rotation = 0;

        const animate = () => {
            rotation += 0.02; // Slower rotation for more detail visibility
            setFrame(rotation);
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);

    return (
        <div className="relative">
            <pre className="font-mono text-primary/30 select-none text-[4px] sm:text-[5px] lg:text-[6px] leading-[0.7] tracking-wider">
                {generateGlobe(frame)}
            </pre>

            {/* Orbit ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                    className="w-full h-[60%] border border-primary/5 rounded-full"
                    style={{
                        transform: 'rotateX(75deg)',
                    }}
                />
            </div>

            {/* Stars */}
            <div className="absolute -inset-20 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-0.5 h-0.5 bg-primary/20 rounded-full animate-pulse"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>
        </div>
    );
}