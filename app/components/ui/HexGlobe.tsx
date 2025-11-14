'use client';

import { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';

export default function HexGlobe() {
    const globeEl = useRef<HTMLDivElement>(null);
    const globeInstance = useRef<any>(null);
    const [countries, setCountries] = useState<any>(null);

    useEffect(() => {
        fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(data => setCountries(data));
    }, []);

    useEffect(() => {
        if (!globeEl.current || !countries) return;

        // Calculate size based on viewport height (vh)
        const getSize = () => {
            // Use 80vh as the base size, ensuring it's responsive
            return Math.min(window.innerHeight * 0.8, window.innerWidth * 0.8);
        };

        const size = getSize();

        const globe = new Globe(globeEl.current)
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
            .hexPolygonsData(countries.features)
            .hexPolygonResolution(3)
            .hexPolygonMargin(0.3)
            .hexPolygonUseDots(false)
            .hexPolygonColor(() => 'rgba(255, 255, 255, 0.8)') // White for land
            .hexPolygonAltitude(0.01)
            .width(size)
            .height(size)
            .backgroundColor('rgba(0,0,0,0)')
            .showAtmosphere(true)
            .atmosphereColor('#616972')
            .atmosphereAltitude(0.15);

        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.5;
        globe.controls().enableZoom = false;
        globe.controls().enablePan = false;
        globe.camera().position.z = 300;

        globeInstance.current = globe;

        // Handle window resize
        const handleResize = () => {
            if (globeInstance.current && globeEl.current) {
                const newSize = getSize();
                globeInstance.current.width(newSize);
                globeInstance.current.height(newSize);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (globeInstance.current) {
                globeInstance.current._destructor();
            }
        };
    }, [countries]);

    return <div ref={globeEl} />;
}
