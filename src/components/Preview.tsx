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
    const [totalDurationSecs, setTotalDurationSecs] = useState(0);

    const parseHTML = useCallback((context: CanvasRenderingContext2D, html: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const elements = tempDiv.childNodes;
        const color = context.fillStyle;

        interface TextSegment {
            text: string;
            styles: { bold: boolean; italic: boolean; underline: boolean };
            isBreak?: boolean;
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
                        segments.push({ 
                            text: '', 
                            styles: currentStyles, 
                            isBreak: true 
                        });
                        return;
                }
            }

            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                // Only create segment if text content has non-whitespace characters
                const trimmedText = node.textContent.trim();
                if (trimmedText) {
                    segments.push({ 
                        text: trimmedText,
                        styles: currentStyles
                    });
                }
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

            currentLine = [];
            currentLineWidth = 0;
        };

        // Process all segments
        for (const segment of segments) {
            if (segment.isBreak) {
                drawCurrentLine();
                currentY += lineHeight; // Only increment Y here for breaks
                continue;
            }

            const words = segment.text.split(/\s+/);
            let isFirstWord = true;

            for (const word of words) {
                if (!word) continue;

                const wordWidth = measureText(word, segment.styles);
                
                if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                    drawCurrentLine();
                    currentY += lineHeight; // Add line height only for word wrapping
                }

                if (currentLine.length > 0 && !isFirstWord) {
                    currentLine.push({ text: ' ', styles: segment.styles });
                    currentLineWidth += measureText(' ', segment.styles);
                }

                currentLine.push({ text: word, styles: segment.styles });
                currentLineWidth += wordWidth;
                isFirstWord = false;
            }
        }

        // Draw any remaining text
        if (currentLine.length > 0) {
            drawCurrentLine();
            currentY += lineHeight; // Add final line height
        }
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCurrentTime = () => {
        const frameRate = 30; // FPS
        return formatTime(currentIndex / frameRate);
    };

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
        setTotalDurationSecs(totalDuration);
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
            <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                <div className="time-display" style={{ 
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: '#fff',
                    padding: '0.25rem 0.5rem',
                    background: '#000',
                    borderRadius: '4px',
                    minWidth: '7ch',
                    whiteSpace: 'nowrap'
                }}>
                    {`${getCurrentTime()} / ${formatTime(totalDurationSecs)}`}
                </div>
                <div className="seek-bar-container" style={{ flex: 1, position: 'relative' }}>
                    <div className="seek-bar-markers">
                        {markers.length > 1 && markers.slice(0, -1).map((marker) => (
                            <div
                                key={marker}
                                className="seek-bar-marker"
                                style={{ left: `${(marker / totalDurationSecs) * 100}%` }}
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
                        style={{ width: '100%' }}
                    />
                </div>
                <button type="button" onClick={handlePlayPause} className="control-button">
                    {isPlaying ? <FaPause /> : <FaPlay />}
                </button>
            </div>
        </div>
    );
}
