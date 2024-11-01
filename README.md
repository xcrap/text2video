# Text2Video - Text Animation Video Generator

A web-based tool that generates video animations from text input.<br>It allows you to create videos based on dynamic text animations with various styling options.
<br>A working demo is available here: https://text2video-six.vercel.app/

## Features

- **Real-time Preview**: Watch your text animations instantly as you edit them
- **Custom Text Styling**:
  - Multiple font sizes (xs, sm, base, lg, xl)
  - Custom colors (hex and named colors supported)
  - Text formatting (bold, italic, underline)
  - Adjustable duration per text segment
- **Video Controls**:
  - Play/Pause functionality
  - Seek bar with segment markers
  - Time display showing current position and total duration
  - Frame-by-frame navigation
- **Export Capabilities**: Generate video frames for further processing
- **Responsive Design**: Works across different screen sizes

## Usage

### Text Format Syntax

Your text here --duration 3 --color #ffffff --textlg

Each line in the editor represents a text segment with the following format:

Options:
- --duration n: Duration in seconds (default: 3)
- --color value: Text color (hex or named color)
- --text[size]: Size modifier (xs, sm, lg, xl)

Text Formatting:
- Use <b>text</b> for bold
- Use <i>text</i> for italic
- Use <u>text</u> for underline

## Installation

1. Clone the repository:

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

## Getting Started
After installation, start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to open the app.

## Disclaimer

This is a work in progress, mostly was done with CoPilot + Claude 3.5 Sonnet as my Next Skills are non existing. If you want to improve on the performance and funcionalities, you're more than welcome. 

## License
Copyright 2024 César Couto

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
