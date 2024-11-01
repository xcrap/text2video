"use client";

import { useState, useEffect, useCallback } from "react";
import Preview from "@/components/Preview";
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

export default function Home() {
	const [textInput, setTextInput] = useState("");
	const [lines, setLines] = useState<string[]>([]);
	const [videoSize, setVideoSize] = useState("1024x1024");
	const [currentEditingLine, setCurrentEditingLine] = useState<number | null>(
		null,
	);
	const [selectedFont, setSelectedFont] = useState("Roboto");
	const [loadedFont, setLoadedFont] = useState<NextFont>(defaultFont);

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

	const handleGenerate = () => {
		// Generate and export the video
	};

	const handleVideoSizeChange = (value: string) => {
		setVideoSize(value);
	};

	const handleFontChange = (value: string) => {
		setSelectedFont(value);
	};

	return (
		<div className="p-4 flex">
			<div className="w-1/2 pr-2">
				<textarea
					value={textInput}
					onChange={handleTextChange}
					onClick={handleClick}
					onKeyUp={handleKeyUp}
					placeholder="Enter text here..."
					className="w-full min-h-72 p-6 border border-neutral-800 rounded-xl bg-neutral-900 text-white focus:outline-none shadow-lg"
				/>
				<div className="p-6 border border-neutral-800 rounded-xl bg-neutral-900 text-white">
					<p className="uppercase font-bold mb-2">Properties</p>
					<ul>
						<li>
							Slide Duration <i>--duration (seconds)</i>
						</li>
						<li>
							Text Color <i>--color (color)</i>
						</li>
						<li>
							Text Size: <i>--fontxs, --fontsm, --fontlg, --fontxl</i>
						</li>
					</ul>
				</div>
			</div>
			<div className="w-1/2 pl-2">
				<div className="mb-4 flex flex-col gap-4">
					<div className="flex items-center">
						<label htmlFor="videoSize" className="mr-4">
							Video Size
						</label>
						<Select value={videoSize} onValueChange={handleVideoSizeChange}>
							<SelectTrigger className="w-[240px] rounded border-white/10">
								<SelectValue placeholder="Select video size" />
							</SelectTrigger>
							<SelectContent className="bg-black ">
								<SelectItem value="1024x1024">1:1 (1024x1024)</SelectItem>
								<SelectItem value="1080x1920">
									Instagram Story Vertical (1080x1920)
								</SelectItem>
								<SelectItem value="1920x1080">Landscape (1920x1080)</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center">
						<label htmlFor="font" className="mr-4">
							Font
						</label>
						<Select value={selectedFont} onValueChange={handleFontChange}>
							<SelectTrigger className="w-[240px] rounded border-white/10">
								<SelectValue placeholder="Select font" />
							</SelectTrigger>
							<SelectContent className="bg-black">
								{POPULAR_FONTS.map((font) => (
									<SelectItem key={font} value={font}>
										{font}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<Preview
					lines={lines}
					videoSize={videoSize}
					currentEditingLine={currentEditingLine}
					selectedFont={selectedFont}
					fontClass={loadedFont.className}
				/>
				<Button
					variant="outline"
					onClick={handleGenerate}
					className="mt-4 rounded hover:bg-black border-white/10 uppercase font-bold"
				>
					Generate Video
				</Button>
			</div>
		</div>
	);
}
