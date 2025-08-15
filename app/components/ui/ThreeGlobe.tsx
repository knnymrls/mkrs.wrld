'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeGlobe() {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene>();
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const sphereRef = useRef<THREE.Mesh>();
    const frameRef = useRef<number>();

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            45,
            mountRef.current.clientWidth / mountRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 3;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true 
        });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create globe
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Create Earth texture
        const textureLoader = new THREE.TextureLoader();
        
        // Create a canvas for the Earth texture
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            // Create gradient for ocean
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#1e3a5f');
            gradient.addColorStop(0.5, '#2c5282');
            gradient.addColorStop(1, '#1e3a5f');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw continents
            ctx.fillStyle = '#2d5f3f';
            
            // Africa & Europe
            ctx.beginPath();
            ctx.ellipse(512, 200, 80, 120, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Asia
            ctx.beginPath();
            ctx.ellipse(700, 180, 120, 80, -0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Americas
            ctx.beginPath();
            ctx.ellipse(250, 256, 60, 140, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Australia
            ctx.beginPath();
            ctx.ellipse(750, 350, 40, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Add some texture detail
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 3;
                ctx.fillStyle = `rgba(45, 95, 63, ${Math.random() * 0.3})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            specular: 0x222222,
            shininess: 25,
            opacity: 0.9,
            transparent: true
        });

        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        sphereRef.current = sphere;

        // Add wireframe overlay for ASCII effect
        const wireframeGeometry = new THREE.SphereGeometry(1.01, 32, 32);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a5568,
            wireframe: true,
            opacity: 0.1,
            transparent: true
        });
        const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        scene.add(wireframe);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);

        // Add stars
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.02,
            opacity: 0.3,
            transparent: true
        });

        const starsVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 10;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);

        // Animation
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);

            // Rotate globe on Y axis (standard Earth rotation)
            if (sphereRef.current) {
                sphereRef.current.rotation.y += 0.005;
                wireframe.rotation.y += 0.005;
            }

            renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
            if (!mountRef.current) return;
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            texture.dispose();
        };
    }, []);

    return (
        <div 
            ref={mountRef} 
            className="w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px]"
            style={{ opacity: 0.5 }}
        />
    );
}