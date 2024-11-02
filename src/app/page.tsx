"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Preview from "@/components/Preview";
import type { PreviewRef } from "@/components/Preview";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	defaultFont,
	POPULAR_FONTS,
	loadFont,
	initializeFonts,
} from "@/utils/fonts";
import type { NextFont } from "next/dist/compiled/@next/font";
import { exportToVideo } from "@/utils/videoExport";
import { Progress } from "@/components/ui/progress";

export default function Home() {
	const [textInput, setTextInput] = useState("");
	const [lines, setLines] = useState<string[]>([]);
	const [videoSize, setVideoSize] = useState("1024x1024");
	const [currentEditingLine, setCurrentEditingLine] = useState<number | null>(
		null,
	);
	const [selectedFont, setSelectedFont] = useState("Roboto");
	const [loadedFont, setLoadedFont] = useState<NextFont>(defaultFont);
	const [isGenerating, setIsGenerating] = useState(false);
	const [progress, setProgress] = useState<{
		stage: string;
		percent: number;
	} | null>(null);
	const previewRef = useRef<PreviewRef>(null);

	// Initialize fonts on mount
	useEffect(() => {
		initializeFonts();
	}, []);

	// Simplify font loading effect
	useEffect(() => {
		const font = loadFont(selectedFont as (typeof POPULAR_FONTS)[number]);
		setLoadedFont(font);
	}, [selectedFont]);

	const updateCurrentLine = (element: HTMLTextAreaElement) => {
		const cursorPosition = element.selectionStart;
		const textBeforeCursor = element.value.substring(0, cursorPosition);
		const lineNumber = textBeforeCursor.split("\n").length - 1;
		setCurrentEditingLine(lineNumber);
	};

	const debouncedSetLines = useCallback((newText: string) => {
		const timeoutId = setTimeout(() => {
			setLines(newText.split("\n"));
		}, 150); // 150ms debounce
		return () => clearTimeout(timeoutId);
	}, []);

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newText = e.target.value;
		setTextInput(newText);
		debouncedSetLines(newText);
		updateCurrentLine(e.target);
	};

	const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
		updateCurrentLine(e.currentTarget);
	};

	const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		updateCurrentLine(e.currentTarget);
	};

	const handleGenerate = async () => {
		const canvas = document.querySelector("canvas");
		if (!canvas || !previewRef.current) return;

		try {
			setIsGenerating(true);
			setProgress({ stage: "Starting...", percent: 0 });

			const frames = previewRef.current.getFrames();
			await exportToVideo(canvas, frames, 30, (stage, percent) => {
				setProgress({ stage, percent });
			});
		} catch (error) {
			console.error("Failed to generate video:", error);
		} finally {
			setIsGenerating(false);
			setProgress(null);
		}
	};

	const handleVideoSizeChange = (value: string) => {
		setVideoSize(value);
	};

	const handleFontChange = (value: string) => {
		setSelectedFont(value);
	};

	return (
		<div className="flex flex-col min-h-screen flex-1">
			<div className="p-4 flex flex-1">
				<div className="w-1/2 pr-2 flex flex-col gap-4">
					<div className="flex flex-col p-6 border border-neutral-800 rounded-xl bg-neutral-900 gap-4">
						<div className="flex items-center">
							<label htmlFor="videoSize" className="mr-4 w-24">
								Video Size
							</label>
							<Select value={videoSize} onValueChange={handleVideoSizeChange}>
								<SelectTrigger className="w-[240px] bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 focus:ring-1 focus:ring-neutral-600 focus:ring-offset-0 transition-colors rounded-lg">
									<SelectValue placeholder="Select video size" />
								</SelectTrigger>
								<SelectContent className="border border-neutral-800 bg-neutral-900 rounded-xl">
									<SelectItem
										value="1024x1024"
										className="hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
									>
										1:1 (1024x1024)
									</SelectItem>
									<SelectItem
										value="1080x1920"
										className="hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
									>
										Instagram Story (1080x1920)
									</SelectItem>
									<SelectItem
										value="1920x1080"
										className="hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
									>
										Landscape (1920x1080)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center">
							<label htmlFor="font" className="mr-4 w-24">
								Font Family
							</label>
							<Select value={selectedFont} onValueChange={handleFontChange}>
								<SelectTrigger className="w-[240px] bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700 focus:ring-1 focus:ring-neutral-600 focus:ring-offset-0 transition-colors rounded-lg">
									<SelectValue placeholder="Select font" />
								</SelectTrigger>
								<SelectContent className="border border-neutral-800 rounded-xl bg-neutral-900">
									{POPULAR_FONTS.map((font) => (
										<SelectItem
											key={font}
											value={font}
											className="hover:bg-neutral-800 focus:bg-neutral-800 cursor-pointer"
										>
											{font}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<textarea
						value={textInput}
						onChange={handleTextChange}
						onClick={handleClick}
						onKeyUp={handleKeyUp}
						placeholder="Enter text here, one slide per line"
						className="w-full min-h-72 p-6 border border-neutral-800 rounded-xl bg-neutral-800 text-white focus:outline-none shadow-lg"
						spellCheck="false"
					/>
					<div className="p-6 border border-neutral-800 rounded-xl bg-neutral-900 text-white">
						<p className="uppercase font-bold mb-2">Properties</p>
						<ul>
							<li>
								<i>--duration (seconds)</i>{" "}
								<span className="ml-2 opacity-30">
									Sets the slide duration, default 3 seconds
								</span>
							</li>
							<li>
								<i>--color (color or hex color)</i>
								<span className="ml-2 opacity-30">
									Sets the text color, default white
								</span>
							</li>
							<li>
								<i>--fontxs, --fontsm, --fontlg, --fontxl</i>
								<span className="ml-2 opacity-30">
									Increases or decreases text size
								</span>
							</li>
						</ul>
					</div>
				</div>
				<div className="w-1/2 pl-2">
					<Preview
						ref={previewRef}
						lines={lines}
						videoSize={videoSize}
						currentEditingLine={currentEditingLine}
						selectedFont={selectedFont}
						fontClass={loadedFont.className}
					/>
				</div>
			</div>
			<div className="flex items-center justify-end h-16 px-6 border-t border-t-neutral-800 bg-neutral-900">
				{progress && (
					<div className="space-y-2 w-full mr-2">
						<div className="flex justify-between text-sm">
							<span>{progress.stage}</span>
							<span>{Math.round(progress.percent)}%</span>
						</div>
						<Progress value={progress.percent} />
					</div>
				)}
				<Button
					variant="outline"
					onClick={handleGenerate}
					disabled={isGenerating}
					className="rounded bg-sky-800 hover:bg-sky-900 border border-sky-700 uppercase font-bold outline-none focus:outline-none"
				>
					{isGenerating ? "Generating..." : "Generate Video"}
				</Button>
			</div>
		</div>
	);
}
