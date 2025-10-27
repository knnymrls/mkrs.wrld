'use client';

import { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';

interface HexGlobeProps {
    images?: string[];
}

export default function HexGlobe({ images = [] }: HexGlobeProps) {
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

        // Generate random positions for images on the globe
        const imageData = [];

        // Duplicate images many times for better coverage
        for (let i = 0; i < 80; i++) {
            const imgIndex = i % images.length;
            imageData.push({
                lat: (Math.random() - 0.5) * 180,
                lng: (Math.random() - 0.5) * 360,
                size: 48,
                img: images[imgIndex],
                alt: 0.01
            });
        }

        // Create connection lines between random images
        const arcsData = [];
        for (let i = 0; i < 40; i++) {
            const start = imageData[Math.floor(Math.random() * imageData.length)];
            const end = imageData[Math.floor(Math.random() * imageData.length)];
            arcsData.push({
                startLat: start.lat,
                startLng: start.lng,
                endLat: end.lat,
                endLng: end.lng
            });
        }

        const globe = new Globe(globeEl.current)
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
            .hexPolygonsData(countries.features)
            .hexPolygonResolution(3)
            .hexPolygonMargin(0.3)
            .hexPolygonUseDots(false)
            .hexPolygonColor(() => 'rgba(255, 255, 255, 0.8)') // White for land
            .hexPolygonAltitude(0.01)
            .width(1600)
            .height(1600)
            .backgroundColor('rgba(0,0,0,0)')
            .showAtmosphere(true)
            .atmosphereColor('#616972')
            .atmosphereAltitude(0.15)
            .htmlElementsData(imageData)
            .htmlElement((d: any) => {
                const el = document.createElement('div');
                el.innerHTML = `<img src="${d.img}" style="width: ${d.size}px; height: ${d.size}px; border-radius: 50%; object-fit: cover;" />`;
                return el;
            })
            .htmlAltitude((d: any) => d.alt)
            .arcsData(arcsData)
            .arcColor(() => 'rgba(100, 100, 100, 0.4)')
            .arcStroke(0.5)
            .arcDashLength(0.4)
            .arcDashGap(0.2)
            .arcDashAnimateTime(8000);

        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.5;
        globe.controls().enableZoom = false;
        globe.controls().enablePan = false;
        globe.camera().position.z = 300;

        globeInstance.current = globe;

        return () => {
            if (globeInstance.current) {
                globeInstance.current._destructor();
            }
        };
    }, [countries, images]);

    return <div ref={globeEl} />;
}
