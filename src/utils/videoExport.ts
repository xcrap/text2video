import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    try {
      ffmpegInstance = new FFmpeg();
      
      // Load FFmpeg with the correct core URL
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw new Error('Failed to initialize FFmpeg');
    }
  }
  return ffmpegInstance;
}

export async function exportToVideo(
  canvas: HTMLCanvasElement,
  frames: string[],
  frameRate = 30
): Promise<void> {
  if (!frames.length) {
    throw new Error('No frames to export');
  }

  // Create an offscreen canvas to handle frame drawing
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = canvas.width;
  offscreenCanvas.height = canvas.height;
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set up MediaRecorder
  const stream = offscreenCanvas.captureStream(frameRate);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm',
    videoBitsPerSecond: 8000000
  });

  const chunks: Blob[] = [];

  try {
    const webmBlob = await new Promise<Blob>((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event.error}`));
      };

      mediaRecorder.start();

      // Draw frames using requestAnimationFrame for better performance
      let frameIndex = 0;
      const startTime = performance.now();
      const frameInterval = 1000 / frameRate;

      function drawNextFrame(timestamp: number) {
        if (frameIndex >= frames.length) {
          mediaRecorder.stop();
          return;
        }

        const elapsed = timestamp - startTime;
        const targetFrame = Math.floor(elapsed / frameInterval);

        if (frameIndex <= targetFrame && frameIndex < frames.length) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            ctx.drawImage(img, 0, 0);
            frameIndex++;
            requestAnimationFrame(drawNextFrame);
          };
          img.onerror = () => {
            reject(new Error(`Failed to load frame ${frameIndex}`));
          };
          img.src = frames[frameIndex];
        } else {
          requestAnimationFrame(drawNextFrame);
        }
      }

      requestAnimationFrame(drawNextFrame);
    });

    // Get FFmpeg instance
    const ffmpeg = await getFFmpeg();

    // Convert WebM to MP4
    const webmBuffer = await webmBlob.arrayBuffer();
    await ffmpeg.writeFile('input.webm', new Uint8Array(webmBuffer));

    // Use better FFmpeg settings
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-movflags', '+faststart',
      'output.mp4'
    ]);

    // Read the output file
    const mp4Data = await ffmpeg.readFile('output.mp4');
    const mp4Blob = new Blob([mp4Data], { type: 'video/mp4' });
    
    // Clean up
    await ffmpeg.deleteFile('input.webm');
    await ffmpeg.deleteFile('output.mp4');

    // Trigger download
    const url = URL.createObjectURL(mp4Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${Date.now()}.mp4`;
    a.click();
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

  } catch (error) {
    console.error('Video export error:', error);
    throw new Error('Failed to convert video');
  }
}