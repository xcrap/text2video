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

export type ProgressCallback = (stage: string, progress: number) => void;

export async function exportToVideo(
  canvas: HTMLCanvasElement,
  frames: string[],
  frameRate = 30,
  onProgress?: ProgressCallback
): Promise<void> {
  if (!frames.length) {
    throw new Error('No frames to export');
  }

  onProgress?.('Initializing', 0);

  // Phase 1: Drawing frames (showing 0-100%)
  const updateRecordingProgress = (frameIndex: number) => {
    const progress = (frameIndex / frames.length) * 100;
    onProgress?.('Recording frames', progress);
  };

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
        reject(new Error(`MediaRecorder error: ${(event as ErrorEvent).error}`));
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

        // Report frame drawing progress from 0-100%
        updateRecordingProgress(frameIndex);

        const elapsed = timestamp - startTime;
        const targetFrame = Math.floor(elapsed / frameInterval);

        if (frameIndex <= targetFrame && frameIndex < frames.length) {
          const img = new Image();
          img.onload = () => {
            if (ctx) {
              ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
              ctx.drawImage(img, 0, 0);
            } else {
              reject(new Error('Canvas context is null'));
              return;
            }
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

    // Phase 2: Converting to MP4 (showing 0-100%)
    onProgress?.('Converting to MP4', 0);  // Start at 0%

    const ffmpeg = await getFFmpeg();

    // Improved FFmpeg progress handling
    let lastProgress = 0;

    ffmpeg.on('log', ({ message }) => {
      // Parse time string to seconds
      const parseTime = (timeStr: string) => {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
      };

      // Parse duration from FFmpeg output
      const durationMatch = message.match(/Duration: (\d{2}:\d{2}:\d{2})/);
      if (durationMatch) {
        const totalSeconds = parseTime(durationMatch[1]);
        if (totalSeconds > 0) {
          console.log('Total duration:', totalSeconds, 'seconds');
        }
      }

      // Parse current time from FFmpeg output
      const timeMatch = message.match(/time=(\d{2}:\d{2}:\d{2})/);
      if (timeMatch) {
        const currentSeconds = parseTime(timeMatch[1]);
        const progress = Math.min(Math.round((currentSeconds / 5) * 100), 100); // Assuming ~5 sec duration
        
        if (progress > lastProgress) {  // Only update if progress increases
          lastProgress = progress;
          onProgress?.('Converting to MP4', progress);
          console.log('FFmpeg progress:', progress, '%');
        }
      }
    });

    // Convert WebM to MP4
    const webmBuffer = await webmBlob.arrayBuffer();
    await ffmpeg.writeFile('input.webm', new Uint8Array(webmBuffer));

    // Add additional log message for debugging
    console.log('Starting FFmpeg conversion...');

    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-movflags', '+faststart',
      '-y',
      'output.mp4'
    ]);

    // Ensure 100% is shown at the end
    onProgress?.('Converting to MP4', 100);

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