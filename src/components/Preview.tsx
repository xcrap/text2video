"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';

interface PreviewProps {
    lines: string[];
    videoSize: string;
}

export default function Preview({ lines, videoSize }: PreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [frames, setFrames] = useState<string[]>([]);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const [markers, setMarkers] = useState<number[]>([]);
    const [width, height] = videoSize.split('x').map(Number);

    // const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    //     const words = text.split(' ');
    //     let line = '';
    //     let testLine = '';
    //     let testWidth: number;
    //     let currentY = y;

    //     for (let n = 0; n < words.length; n++) {
    //         testLine = `${line}${words[n]} `;
    //         testWidth = context.measureText(testLine).width;
    //         if (testWidth > maxWidth && n > 0) {
    //             context.fillText(line, x, currentY);
    //             line = `${words[n]} `;
    //             currentY += lineHeight;
    //         } else {
    //             line = testLine;
    //         }
    //     }
    //     context.fillText(line, x, currentY);
    //     return currentY + lineHeight;
    // };

    const parseHTML = useCallback((context: CanvasRenderingContext2D, html: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const elements = tempDiv.childNodes;
        let currentY = y;
        const currentX = x;
        const defaultFont = context.font;

        const renderText = (text: string, isUnderline = false) => {
            const words = text.split(' ');
            let line = '';

            for (const word of words) {
                const testLine = line + (line ? ' ' : '') + word;
                const metrics = context.measureText(testLine);

                if (metrics.width > maxWidth && line !== '') {
                    context.fillText(line, currentX, currentY);
                    if (isUnderline) {
                        context.beginPath();
                        context.moveTo(currentX, currentY + 2);
                        context.lineTo(currentX + context.measureText(line).width, currentY + 2);
                        context.stroke();
                    }
                    line = word;
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }

            if (line) {
                context.fillText(line, currentX, currentY);
                if (isUnderline) {
                    context.beginPath();
                    context.moveTo(currentX, currentY + 2);
                    context.lineTo(currentX + context.measureText(line).width, currentY + 2);
                    context.stroke();
                }
                currentY += lineHeight;
            }
        };

        const processElement = (element: ChildNode) => {
            if (element.nodeType === Node.TEXT_NODE) {
                renderText(element.textContent || '');
            } else if (element.nodeType === Node.ELEMENT_NODE) {
                const el = element as HTMLElement;
                const originalFont = context.font;

                if (el.tagName === 'BR') {
                    currentY += lineHeight;
                } else {
                    if (el.tagName === 'B') {
                        context.font = `bold ${defaultFont}`;
                    } else if (el.tagName === 'I') {
                        context.font = `italic ${defaultFont}`;
                    } else if (el.tagName === 'U') {
                        context.font = `${defaultFont}`;
                    }

                    Array.from(el.childNodes).forEach(processElement);
                    context.font = originalFont;
                }
            }
        };

        Array.from(elements).forEach(processElement);
        context.font = defaultFont; // Reset to default font
    }, []);

    useEffect(() => {
        if (!canvasRef.current || lines.length === 0) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const newFrames: string[] = [];
        const newMarkers: number[] = [];
        let totalDuration = 0;

        for (const line of lines) {
            const [text, ...optionsArr] = line.split('--');
            const optionsStr = optionsArr.join('--');
            const durationMatch = optionsStr.match(/duration\s+(\d+)/);
            const duration = durationMatch ? Number.parseInt(durationMatch[1], 10) : 3;
            const colorMatch = optionsStr.match(/color\s+(\w+|#[0-9a-fA-F]{6})/);
            const color = colorMatch ? colorMatch[1] : '#fff';

            context.fillStyle = '#000';
            context.fillRect(0, 0, width, height);
            context.fillStyle = color;
            context.font = '48px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';

            const lineHeight = 48; // Same as font size
            const x = width / 2;
            const y = height / 2;
            parseHTML(context, text.trim(), x, y, width - 20, lineHeight);

            const frame = canvas.toDataURL('image/jpeg');
            const frameCount = duration * 30; // Assuming 30 FPS
            for (let i = 0; i < frameCount; i++) {
                newFrames.push(frame);
            }

            totalDuration += duration;
            newMarkers.push(totalDuration);
        }

        setFrames(newFrames);
        setMarkers(newMarkers);
        setCurrentIndex(0);
    }, [lines, width, height, parseHTML]);

    useEffect(() => {
        if (isPlaying && frames.length > 0) {
            const id = setInterval(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % frames.length);
            }, 1000 / 30); // 30 FPS
            intervalIdRef.current = id;
        } else if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [isPlaying, frames]);

    useEffect(() => {
        if (!canvasRef.current || frames.length === 0) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const img = new Image();
        img.src = frames[currentIndex];
        img.onload = () => {
            context.drawImage(img, 0, 0, width, height);
        };
    }, [currentIndex, frames, width, height]);

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentIndex(Number(event.target.value));
        if (isPlaying) {
            setIsPlaying(false);
        }
    };

    return (
        <div className="preview">
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', aspectRatio: `${width} / ${height}` }}
            />
            <div className="controls">
                <div className="seek-bar-container">
                    <div className="seek-bar-markers">
                        {markers.slice(0, -1).map((marker) => (
                            <div
                                key={marker}
                                className="seek-bar-marker"
                                style={{ left: `${(marker / markers[markers.length - 1]) * 100}%` }}
                            />
                        ))}
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={frames.length - 1}
                        value={currentIndex}
                        onChange={handleSeek}
                        className="seek-bar"
                    />
                </div>
                <button type="button" onClick={handlePlayPause} className="control-button ml-6">
                    {isPlaying ? <FaPause /> : <FaPlay />}
                </button>
            </div>
        </div>
    );
}
