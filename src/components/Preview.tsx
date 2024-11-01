"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import { Button } from "@/components/ui/button";

interface PreviewProps {
    lines: string[];
    videoSize: string;
    currentEditingLine: number | null;
    selectedFont: string;
    fontClass: string;
}

// Move font calculations outside component
const calculateFontSize = (width: number, height: number) => Math.min(width, height) * 0.05;

const createFontStyle = (fontSize: number, fontName: string, weight = '400', style = 'normal') => 
  `${weight} ${style} ${fontSize}px "${fontName}"`;

// First, create a helper function outside the component
const createFontStyles = (fontSize: number, fontName: string) => ({
    normal: createFontStyle(fontSize, fontName),
    bold: createFontStyle(fontSize, fontName, 'bold'),
    italic: createFontStyle(fontSize, fontName, '400', 'italic'),
    boldItalic: createFontStyle(fontSize, fontName, 'bold', 'italic')
});

// Add font size multipliers
const TEXT_SIZE_MULTIPLIERS = {
    xs: 0.5,    // 50% of base size
    sm: 0.75,   // 75% of base size
    base: 1,    // default size
    lg: 1.5,    // 150% of base size
    xl: 2,      // 200% of base size
} as const;

export default function Preview({ lines, videoSize, currentEditingLine, selectedFont, fontClass }: PreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [frames, setFrames] = useState<string[]>([]);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const [markers, setMarkers] = useState<number[]>([]);
    const [width, height] = videoSize.split('x').map(Number);
    const [totalDurationSecs, setTotalDurationSecs] = useState(0);
    const [lineStartFrames, setLineStartFrames] = useState<number[]>([]);
    const [isFontLoaded, setIsFontLoaded] = useState(false);

    const BASE_FONT_SIZE = calculateFontSize(width, height);

    // Cache font styles
    const fontStyleRef = useRef<ReturnType<typeof createFontStyles> | null>(null);

    // Use useMemo to handle both initialization and updates
    useMemo(() => {
        fontStyleRef.current = createFontStyles(BASE_FONT_SIZE, selectedFont);
    }, [BASE_FONT_SIZE, selectedFont]);

    // Simplify font loading effect
    useEffect(() => {
        const checkFont = async () => {
            await document.fonts.ready;
            setIsFontLoaded(true);
        };
        
        checkFont();
    }, []);

    // Update parseHTML to use fontClass
    const parseHTML = useCallback((context: CanvasRenderingContext2D, html: string, x: number, y: number, maxWidth: number, lineHeight: number) => {

        // Add explicit dependency usage at the start of the function
        if (!fontStyleRef.current || !selectedFont) {
            return;
        }

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
            // Use cached font styles instead of building string each time
            if (!fontStyleRef.current) return;
            const fontStyle = styles.bold && styles.italic ? fontStyleRef.current.boldItalic :
                            styles.bold ? fontStyleRef.current.bold :
                            styles.italic ? fontStyleRef.current.italic :
                            fontStyleRef.current.normal;
            
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

            if (node.nodeType === Node.TEXT_NODE) {
                // Split the text to preserve spaces
                const parts = node.textContent?.split(/(\s+)/);
                if (parts) {
                    for (const part of parts) {
                        if (part.length > 0) {
                            segments.push({ 
                                text: part,
                                styles: currentStyles
                            });
                        }
                    }
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

            // Handle the segment as a whole, including spaces
            const segmentWidth = measureText(segment.text, segment.styles);
            
            if (currentLineWidth + segmentWidth > maxWidth && currentLine.length > 0) {
                drawCurrentLine();
                currentY += lineHeight; // Add line height only for word wrapping
            }

            currentLine.push(segment);
            currentLineWidth += segmentWidth;
        }

        // Draw any remaining text
        if (currentLine.length > 0) {
            drawCurrentLine();
            currentY += lineHeight; // Add final line height
        }
    }, [selectedFont]); // Only depend on selectedFont, not BASE_FONT_SIZE

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCurrentTime = () => {
        const frameRate = 30; // FPS
        return formatTime(currentIndex / frameRate);
    };

    // Single effect to handle frame generation
    useEffect(() => {
        if (!canvasRef.current || lines.length === 0 || !isFontLoaded) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const LINE_HEIGHT = BASE_FONT_SIZE * 1.2;

        const newFrames: string[] = [];
        const newMarkers: number[] = [];
        const newLineStartFrames: number[] = [];
        let totalDuration = 0;

        for (const line of lines) {
            const startFrame = newFrames.length;
            newLineStartFrames.push(startFrame);
            
            const [text, ...optionsArr] = line.split('--');
            const optionsStr = optionsArr.join('--');
            
            // Parse all options
            const durationMatch = optionsStr.match(/duration\s+(\d+)/);
            const colorMatch = optionsStr.match(/color\s+(\w+|#[0-9a-fA-F]{6})/);
            const textSizeMatch = optionsStr.match(/text(xs|sm|lg|xl)\b/);
            
            // Get values from matches
            const duration = durationMatch ? Number.parseInt(durationMatch[1], 10) : 3;
            const color = colorMatch ? colorMatch[1] : '#fff';
            const textSizeMultiplier = textSizeMatch 
                ? TEXT_SIZE_MULTIPLIERS[textSizeMatch[1] as keyof typeof TEXT_SIZE_MULTIPLIERS]
                : TEXT_SIZE_MULTIPLIERS.base;

            // Apply adjusted font size for this line
            const adjustedFontSize = BASE_FONT_SIZE * textSizeMultiplier;
            fontStyleRef.current = createFontStyles(adjustedFontSize, selectedFont);

            // Clear background
            context.fillStyle = '#000';
            context.fillRect(0, 0, width, height);

            // Set color and call parseHTML
            context.fillStyle = color;
            const x = width / 2;
            const y = height / 2;
            parseHTML(context, text.trim(), x, y, width - adjustedFontSize, adjustedFontSize * 1.2);

            const frame = canvas.toDataURL('image/webp', 0.8);
            const frameCount = duration * 30; // Assuming 30 FPS
            for (let i = 0; i < frameCount; i++) {
                newFrames.push(frame);
            }

            totalDuration += duration;
            newMarkers.push(totalDuration);
        }

        setFrames(newFrames);
        setMarkers(newMarkers);
        setLineStartFrames(newLineStartFrames);
        setTotalDurationSecs(totalDuration);
        setCurrentIndex(0); // Always start from beginning when frames change
    }, [lines, width, height, parseHTML, isFontLoaded, BASE_FONT_SIZE, selectedFont]);

    // Combine index management into a single effect
    useEffect(() => {
        // Skip if we don't have necessary data
        if (!frames.length || !lineStartFrames.length) return;

        // Handle editing line changes
        if (currentEditingLine !== null) {
            const targetFrame = lineStartFrames[currentEditingLine];
            if (targetFrame !== undefined && !isPlaying) {
                requestAnimationFrame(() => {
                    setCurrentIndex(targetFrame);
                });
            }
            return;
        }

        // Handle playback
        if (isPlaying) {
            const id = setInterval(() => {
                setCurrentIndex(prevIndex => {
                    const nextIndex = prevIndex + 1;
                    if (nextIndex >= frames.length) {
                        setIsPlaying(false);
                        return prevIndex;
                    }
                    return nextIndex;
                });
            }, 1000 / 30);
            intervalIdRef.current = id;

            return () => {
                if (intervalIdRef.current) {
                    clearInterval(intervalIdRef.current);
                    intervalIdRef.current = null;
                }
            };
        }
    }, [currentEditingLine, lineStartFrames, isPlaying, frames.length]);

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
        setIsPlaying(prev => !prev);
    };

    const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newIndex = Number(event.target.value);
        setCurrentIndex(newIndex);
        
        if (isPlaying) {
            setIsPlaying(false);
        }
    };

    // Log current state in render
    // console.log('Render state:', {
    //     currentEditingLine,
    //     currentIndex,
    //     lineStartFrames,
    //     isPlaying
    // });

    return (
        <div className={`preview ${fontClass}`}>
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
                <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handlePlayPause}
                    className="rounded size-10 hover:bg-black border-white/10">
                    {isPlaying ? <FaPause className="!size-3" /> : <FaPlay className="!size-3" />}
                </Button>
            </div>
        </div>
    );
}
