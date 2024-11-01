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

    const parseHTML = useCallback((context: CanvasRenderingContext2D, html: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const elements = tempDiv.childNodes;
        const color = context.fillStyle;

        interface TextSegment {
            text: string;
            styles: { bold: boolean; italic: boolean; underline: boolean };
        }

        const segments: TextSegment[] = [];
        let currentY = y;

        const applyStyles = (styles: { bold: boolean; italic: boolean; underline: boolean }) => {
            const fontStyle = [
                styles.bold ? 'bold' : '',
                styles.italic ? 'italic' : '',
                '48px',
                'Arial'
            ].filter(Boolean).join(' ');
            context.font = fontStyle;
            context.fillStyle = color;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
        };

        const measureText = (text: string, styles: { bold: boolean; italic: boolean; underline: boolean }) => {
            applyStyles(styles);
            return context.measureText(text).width;
        };

        const drawText = (text: string, styles: { bold: boolean; italic: boolean; underline: boolean }, xPos: number, yPos: number) => {
            applyStyles(styles);
            context.fillText(text, xPos, yPos);

            if (styles.underline) {
                const textWidth = context.measureText(text).width;
                context.beginPath();
                context.moveTo(xPos - textWidth/2, yPos + 2);
                context.lineTo(xPos + textWidth/2, yPos + 2);
                context.stroke();
            }
        };

        const processNode = (node: ChildNode, parentStyles: { bold: boolean; italic: boolean; underline: boolean }) => {
            const currentStyles = { ...parentStyles };

            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                
                switch (element.tagName) {
                    case 'B':
                        currentStyles.bold = true;
                        break;
                    case 'I':
                        currentStyles.italic = true;
                        break;
                    case 'U':
                        currentStyles.underline = true;
                        break;
                    case 'BR':
                        segments.push({ text: '\n', styles: currentStyles });
                        return;
                }
            }

            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                segments.push({ 
                    text: node.textContent,
                    styles: currentStyles
                });
            }

            if (node.childNodes?.length) {
                for (const child of node.childNodes) {
                    processNode(child, currentStyles);
                }
            }
        };

        // First pass: collect all segments with their styles
        const initialStyles = { bold: false, italic: false, underline: false };
        for (const node of elements) {
            processNode(node, initialStyles);
        }

        // Second pass: process line wrapping while maintaining styles
        let currentLine: TextSegment[] = [];
        let currentLineWidth = 0;

        const drawCurrentLine = () => {
            if (currentLine.length === 0) return;

            // Calculate total width for centering
            let totalWidth = 0;
            for (const segment of currentLine) {
                totalWidth += measureText(segment.text, segment.styles);
            }

            // Draw each segment
            let xOffset = x - totalWidth / 2;
            for (const segment of currentLine) {
                const segmentWidth = measureText(segment.text, segment.styles);
                drawText(segment.text, segment.styles, xOffset + segmentWidth / 2, currentY);
                xOffset += segmentWidth;
            }

            currentY += lineHeight;
            currentLine = [];
            currentLineWidth = 0;
        };

        // Process all segments
        for (const segment of segments) {
            if (segment.text === '\n') {
                drawCurrentLine();
                continue;
            }

            const words = segment.text.trim().split(/\s+/);
            for (const word of words) {
                const wordWidth = measureText(word, segment.styles);
                const spaceWidth = measureText(' ', segment.styles);
                
                if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                    drawCurrentLine();
                }

                if (currentLine.length > 0) {
                    currentLine.push({ text: ' ', styles: segment.styles });
                    currentLineWidth += spaceWidth;
                }

                currentLine.push({ text: word, styles: segment.styles });
                currentLineWidth += wordWidth;
            }
        }

        // Draw any remaining text
        if (currentLine.length > 0) {
            drawCurrentLine();
        }
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

            // Clear background
            context.fillStyle = '#000';
            context.fillRect(0, 0, width, height);

            // Set color and call parseHTML
            context.fillStyle = color;
            const lineHeight = 48;
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
