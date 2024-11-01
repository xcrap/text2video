"use client";

import { useState, useEffect } from 'react';
import Preview from '@/components/Preview';
import Image from "next/image";

export default function Home() {
  const [textInput, setTextInput] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [videoSize, setVideoSize] = useState('1024x1024');

  useEffect(() => {
    const newLines = textInput.split('\n');
    setLines(newLines);
  }, [textInput]); // Add dependency array here

  const handleGenerate = () => {
    // Generate and export the video
  };

  return (
    <div className="p-4 flex">
      <div className="w-1/2 pr-2">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter text here..."
          className="w-full min-h-64 p-2 border rounded bg-black text-white focus:outline-none"
        />
        <div className="mt-4">
          <label htmlFor="videoSize" className="mr-2">Video Size:</label>
          <select
            id="videoSize"
            value={videoSize}
            onChange={(e) => setVideoSize(e.target.value)}
            className="border p-1 rounded bg-black text-white"
          >
            <option value="1024x1024">1:1 (1024x1024)</option>
            <option value="1080x1920">Instagram Story Vertical (1080x1920)</option>
            <option value="1920x1080">Landscape (1920x1080)</option>
          </select>
        </div>
        <button type="button" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={handleGenerate}>
          Generate Video
        </button>
      </div>
      <div className="w-1/2 pl-2">
        <Preview lines={lines} videoSize={videoSize} />
      </div>
    </div>
  );
}
