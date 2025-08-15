'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AsciiGlobe() {
    const containerRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number>();
    const asciiRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (!containerRef.current || !asciiRef.current) return;

        // ASCII characters for different brightness levels
        const ASCII_CHARS = ' .,:;i1tfLCG08@';
        
        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.z = 3;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(100, 50); // ASCII resolution
        
        // Create sphere with earth-like texture
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        
        // Create a simple earth-like texture programmatically
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            // Ocean (blue background)
            ctx.fillStyle = '#1a365d';
            ctx.fillRect(0, 0, 256, 128);
            
            // Continents (green/brown)
            ctx.fillStyle = '#22543d';
            
            // Simplified continent shapes
            // Africa/Europe
            ctx.beginPath();
            ctx.ellipse(128, 64, 30, 40, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Americas
            ctx.beginPath();
            ctx.ellipse(60, 64, 20, 35, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Asia
            ctx.beginPath();
            ctx.ellipse(180, 50, 35, 25, -0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add some texture variation
            for (let i = 0; i < 100; i++) {
                ctx.fillStyle = `rgba(34, 84, 61, ${Math.random() * 0.5})`;
                ctx.beginPath();
                ctx.arc(
                    Math.random() * 256,
                    Math.random() * 128,
                    Math.random() * 5,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshPhongMaterial({ 
            map: texture,
            shininess: 10
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);
        
        // Function to convert rendered image to ASCII
        const imageToAscii = () => {
            renderer.render(scene, camera);
            
            const gl = renderer.getContext();
            const width = renderer.domElement.width;
            const height = renderer.domElement.height;
            const pixels = new Uint8Array(width * height * 4);
            
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            
            let ascii = '';
            for (let y = height - 1; y >= 0; y--) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const brightness = (r + g + b) / 3;
                    const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
                    ascii += ASCII_CHARS[charIndex];
                }
                ascii += '\n';
            }
            
            if (asciiRef.current) {
                asciiRef.current.textContent = ascii;
            }
        };
        
        // Animation loop
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);
            
            // Rotate the sphere
            sphere.rotation.y += 0.005;
            sphere.rotation.x = 0.1;
            
            // Convert to ASCII
            imageToAscii();
        };
        
        animate();
        
        // Cleanup
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            texture.dispose();
        };
    }, []);

    return (
        <div className="relative flex items-center justify-center">
            <div ref={containerRef} className="absolute opacity-0 pointer-events-none" />
            <pre 
                ref={asciiRef}
                className="font-mono text-[8px] leading-[8px] text-primary/20 select-none whitespace-pre overflow-hidden"
                style={{ letterSpacing: '0.1em' }}
            />
        </div>
    );
}