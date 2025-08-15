'use client';

import { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

export default function GlobeGL() {
    const globeEl = useRef<HTMLDivElement>(null);
    const globeInstance = useRef<any>(null);

    useEffect(() => {
        if (!globeEl.current) return;

        // Initialize globe - minimal black and white
        const globe = Globe()(globeEl.current)
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .width(600)
            .height(600)
            .backgroundColor('rgba(0,0,0,0)')
            .showAtmosphere(false)
            .globeMaterial({ 
                color: '#000000',
                wireframe: true,
                opacity: 0.15
            });

        // Set up auto-rotation
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.5;
        globe.controls().enableZoom = false;
        globe.controls().enablePan = false;
        
        // Position camera
        globe.camera().position.z = 350;
        
        globeInstance.current = globe;

        // Handle resize
        const handleResize = () => {
            if (globeInstance.current && globeEl.current) {
                const width = Math.min(window.innerWidth * 0.8, 600);
                const height = width;
                globeInstance.current.width(width);
                globeInstance.current.height(height);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (globeInstance.current) {
                globeInstance.current._destructor();
            }
        };
    }, []);

    return (
        <div 
            ref={globeEl}
            className="globe-container"
            style={{
                filter: 'grayscale(100%) contrast(1.5)',
                opacity: 0.3
            }}
        />
    );
}