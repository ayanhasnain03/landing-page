"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { debounce } from "lodash";

interface AnimatedGradientBackgroundProps {
    className?: string;
    children?: React.ReactNode;
    intensity?: "subtle" | "medium" | "strong";
    interactive?: boolean;
    colorScheme?: "blue" | "purple" | "green" | "orange" | "pink" | "cyan" | "red" | "yellow" | "custom";
    customHue?: number;
    customSaturation?: number;
    customLightness?: number;
}

interface Beam {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    hue: number;
    pulse: number;
    pulseSpeed: number;
    targetX?: number;
    targetY?: number;
    interactive: boolean;
    scale: number;
    rotationSpeed: number;
    waveOffset: number;
    waveSpeed: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    hue: number;
    life: number;
    maxLife: number;
}

// Color scheme configurations
const colorSchemes = {
    blue: { baseHue: 190, hueRange: 70, saturation: 85, lightness: 65 },
    purple: { baseHue: 270, hueRange: 60, saturation: 80, lightness: 60 },
    green: { baseHue: 120, hueRange: 50, saturation: 75, lightness: 55 },
    orange: { baseHue: 30, hueRange: 40, saturation: 90, lightness: 60 },
    pink: { baseHue: 320, hueRange: 50, saturation: 85, lightness: 65 },
    cyan: { baseHue: 180, hueRange: 40, saturation: 80, lightness: 70 },
    red: { baseHue: 0, hueRange: 30, saturation: 85, lightness: 55 },
    yellow: { baseHue: 60, hueRange: 30, saturation: 90, lightness: 65 },
    custom: { baseHue: 190, hueRange: 70, saturation: 85, lightness: 65 },
};

function createBeam(
    width: number,
    height: number,
    interactive: boolean = false,
    colorScheme: keyof typeof colorSchemes = "blue",
    customHue?: number,
    // customSaturation?: number,
    // customLightness?: number
): Beam {
    const angle = -35 + Math.random() * 10;
    const isInteractive = interactive && Math.random() > 0.7;

    const scheme = colorSchemes[colorScheme];
    const baseHue = colorScheme === "custom" && customHue ? customHue : scheme.baseHue;
    // const saturation = colorScheme === "custom" && customSaturation ? customSaturation : scheme.saturation;
    // const lightness = colorScheme === "custom" && customLightness ? customLightness : scheme.lightness;

    return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle: angle,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.12 + Math.random() * 0.16,
        hue: baseHue + Math.random() * scheme.hueRange,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        interactive: isInteractive,
        scale: 1 + Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        waveOffset: Math.random() * Math.PI * 2,
        waveSpeed: 0.01 + Math.random() * 0.02,
    };
}

export function BeamsBackground({
    className,
    intensity = "strong",
    interactive = true,
    colorScheme = "blue",
    customHue,
    customSaturation,
    customLightness,
}: AnimatedGradientBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const beamsRef = useRef<Beam[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number>(0);
    const mouseRef = useRef({ x: 0, y: 0 });
    // const [isHovered, setIsHovered] = useState(false);
    const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

    // Enhanced responsive beam counts and sizing
    const getBeamCount = () => {
        if (typeof window === 'undefined') return 20;
        const width = window.innerWidth;
        if (width < 480) return 8; // Small mobile
        if (width < 768) return 12; // Mobile
        if (width < 1024) return 18; // Tablet
        if (width < 1440) return 25; // Desktop
        return 35; // Large screens
    };

    const getBeamSizing = () => {
        if (typeof window === 'undefined') return { width: 60, length: 800 };
        const width = window.innerWidth;
        if (width < 480) return { width: 40, length: 600 }; // Smaller beams for mobile
        if (width < 768) return { width: 50, length: 700 };
        if (width < 1024) return { width: 60, length: 800 };
        if (width < 1440) return { width: 70, length: 900 };
        return { width: 80, length: 1000 };
    };

    const opacityMap = {
        subtle: 0.6,
        medium: 0.8,
        strong: 1,
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    const createParticle = (x: number, y: number, hue: number) => {
        return {
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 3 + 1,
            opacity: 1,
            hue,
            life: 0,
            maxLife: 60 + Math.random() * 60,
        };
    };

    // Handle screen resize
    useEffect(() => {
        const handleResize = () => {
            setScreenSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const updateCanvasSize = () => {
            const dpr = window.devicePixelRatio || 1;
            const displayWidth = window.innerWidth;
            const displayHeight = window.innerHeight;

            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            ctx.scale(dpr, dpr);

            const totalBeams = getBeamCount();
            const sizing = getBeamSizing();

            beamsRef.current = Array.from({ length: totalBeams }, () => {
                //@ts-expect-error "fix later"
                const beam = createBeam(displayWidth, displayHeight, interactive, colorScheme, customHue, customSaturation, customLightness);
                beam.width = sizing.width + Math.random() * 40;
                beam.length = sizing.length + Math.random() * 200;
                return beam;
            });
        };

        updateCanvasSize();

        const debouncedResize = debounce(updateCanvasSize, 100);
        window.addEventListener("resize", debouncedResize);

        if (interactive) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("click", () => {
                const scheme = colorSchemes[colorScheme];
                const baseHue = colorScheme === "custom" && customHue ? customHue : scheme.baseHue;
                const hue = baseHue + Math.random() * scheme.hueRange;
                for (let i = 0; i < 10; i++) {
                    particlesRef.current.push(createParticle(mouseRef.current.x, mouseRef.current.y, hue));
                }
            });
        }

        function resetBeam(beam: Beam, index: number, totalBeams: number) {
            if (!canvas) return beam;

            const sizing = getBeamSizing();
            const columns = screenSize.width < 768 ? 2 : 3;
            const column = index % columns;
            const spacing = canvas.width / columns;

            beam.y = canvas.height + 100;
            beam.x =
                column * spacing +
                spacing / 2 +
                (Math.random() - 0.5) * spacing * 0.4;
            beam.width = sizing.width + Math.random() * 40;
            beam.speed = 0.4 + Math.random() * 0.3;
            beam.hue = 190 + (index * 70) / totalBeams;
            beam.opacity = 0.15 + Math.random() * 0.1;
            beam.scale = 1 + Math.random() * 0.3;
            beam.rotationSpeed = (Math.random() - 0.5) * 0.015;
            return beam;
        }

        function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
            ctx.save();
            ctx.translate(beam.x, beam.y);
            ctx.rotate((beam.angle * Math.PI) / 180);

            // Interactive effects
            if (beam.interactive && interactive) {
                const dx = mouseRef.current.x - beam.x;
                const dy = mouseRef.current.y - beam.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = screenSize.width < 768 ? 150 : 200;

                if (distance < maxDistance) {
                    const influence = 1 - distance / maxDistance;
                    beam.scale = 1 + influence * 0.4;
                    beam.opacity *= 1 + influence * 0.2;
                }
            }

            // Wave effect
            const waveX = Math.sin(beam.waveOffset) * (screenSize.width < 768 ? 10 : 20);
            ctx.translate(waveX, 0);

            // Calculate pulsing opacity with enhanced effects
            const pulsingOpacity =
                beam.opacity *
                (0.8 + Math.sin(beam.pulse) * 0.2) *
                opacityMap[intensity] *
                beam.scale;

            const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

            // Enhanced gradient with more color stops and effects
            gradient.addColorStop(0, `hsla(${beam.hue}, 85%, 65%, 0)`);
            gradient.addColorStop(
                0.05,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.3})`
            );
            gradient.addColorStop(
                0.15,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.7})`
            );
            gradient.addColorStop(
                0.4,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`
            );
            gradient.addColorStop(
                0.6,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`
            );
            gradient.addColorStop(
                0.85,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.7})`
            );
            gradient.addColorStop(
                0.95,
                `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.3})`
            );
            gradient.addColorStop(1, `hsla(${beam.hue}, 85%, 65%, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);

            // Add glow effect
            ctx.restore();
        }

        function animate() {
            if (!canvas || !ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.filter = "blur(35px)";

            const totalBeams = beamsRef.current.length;
            beamsRef.current.forEach((beam, index) => {
                beam.y -= beam.speed;
                beam.pulse += beam.pulseSpeed;

                // Reset beam when it goes off screen
                if (beam.y + beam.length < -100) {
                    resetBeam(beam, index, totalBeams);
                }

                drawBeam(ctx, beam);
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [intensity]);

    return (
        <div
            className={cn(
                "relative min-h-screen w-full overflow-hidden bg-neutral-950",
                className
            )}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{ filter: "blur(15px)" }}
            />

            <motion.div
                className="absolute inset-0 bg-neutral-950/5"
                animate={{
                    opacity: [0.05, 0.15, 0.05],
                }}
                transition={{
                    duration: 10,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                }}
                style={{
                    backdropFilter: "blur(50px)",
                }}
            />

            <div className="relative z-10 flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-6 px-4 text-center">
                    <motion.h1
                        className="text-6xl md:text-7xl lg:text-8xl font-semibold text-white tracking-tighter"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        Beams
                        <br />
                        Background
                    </motion.h1>
                    <motion.p
                        className="text-lg md:text-2xl lg:text-3xl text-white/70 tracking-tighter"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        For your pleasure
                    </motion.p>
                </div>
            </div>
        </div>
    );
}
