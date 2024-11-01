"use client";

import { useState, useEffect } from 'react';
import Preview from '@/components/Preview';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const [textInput, setTextInput] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [videoSize, setVideoSize] = useState('1024x1024');
  const [currentEditingLine, setCurrentEditingLine] = useState<number | null>(null);

  useEffect(() => {
    const newLines = textInput.split('\n');
    setLines(newLines);
  }, [textInput]);

  const updateCurrentLine = (element: HTMLTextAreaElement) => {
    const cursorPosition = element.selectionStart;
    const textBeforeCursor = element.value.substring(0, cursorPosition);
    const lineNumber = textBeforeCursor.split('\n').length - 1;
    setCurrentEditingLine(lineNumber);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
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
      </div>
      <div className="w-1/2 pl-2">
      <div className="mb-4 flex items-center">
          <label htmlFor="videoSize" className="mr-4">Video Size</label>
          <Select value={videoSize} onValueChange={handleVideoSizeChange}>
            <SelectTrigger className="w-[240px] rounded border-white/10">
              <SelectValue placeholder="Select video size" />
            </SelectTrigger>
            <SelectContent className="bg-black ">
              <SelectItem value="1024x1024">1:1 (1024x1024)</SelectItem>
              <SelectItem value="1080x1920">Instagram Story Vertical (1080x1920)</SelectItem>
              <SelectItem value="1920x1080">Landscape (1920x1080)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Preview  
          lines={lines} 
          videoSize={videoSize} 
          currentEditingLine={currentEditingLine} 
        />
        <Button 
          variant="outline" 
          onClick={handleGenerate}
          className="mt-4 rounded hover:bg-black border-white/10 uppercase font-bold">
          Generate Video
        </Button>
      </div>
    </div>
  );
}
