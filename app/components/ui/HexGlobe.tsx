'use client';

import { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';

export default function HexGlobe() {
    const globeEl = useRef<HTMLDivElement>(null);
    const globeInstance = useRef<any>(null);
    const [countries, setCountries] = useState<any>(null);

    useEffect(() => {
        // Fetch countries GeoJSON data
        fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(data => {
                setCountries(data);
            });
    }, []);

    useEffect(() => {
        if (!globeEl.current || !countries) return;

        // Initialize globe with hexed polygons
        const globe = Globe()(globeEl.current)
            .globeImageUrl('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg')
            .hexPolygonsData(countries.features)
            .hexPolygonResolution(3)
            .hexPolygonMargin(0.3)
            .hexPolygonUseDots(true)
            .hexPolygonColor(() => '#ffffff')
            .hexPolygonAltitude(0.01)
            .width(1500)
            .height(1500)
            .backgroundColor('rgba(0,0,0,0)')
            .showAtmosphere(true)
            .atmosphereColor('#ffffff')
            .atmosphereAltitude(0.15);

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
                const width = Math.min(window.innerWidth * 0.95, 1500);
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
    }, [countries]);

    return (
        <div
            ref={globeEl}
            className="globe-container"
            style={{
                opacity: 0.2
            }}
        />
    );
}