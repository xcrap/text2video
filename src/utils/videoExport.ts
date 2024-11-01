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

  const stream = canvas.captureStream(frameRate);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm',
    videoBitsPerSecond: 8000000
  });

  const chunks: Blob[] = [];
  
  const webmBlob = await new Promise<Blob>((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.onerror = () => {
      reject(new Error('MediaRecorder error'));
    };

    mediaRecorder.start();

    let frameIndex = 0;
    const ctx = canvas.getContext('2d');
    
    function drawNextFrame() {
      if (frameIndex >= frames.length) {
        mediaRecorder.stop();
        return;
      }

      const img = new Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(img, 0, 0);
        frameIndex++;
        setTimeout(drawNextFrame, 1000 / frameRate);
      };
      img.src = frames[frameIndex];
    }

    drawNextFrame();
  });

  try {
    // Get FFmpeg instance
    const ffmpeg = await getFFmpeg();

    // Convert WebM to MP4
    const webmBuffer = await webmBlob.arrayBuffer();
    await ffmpeg.writeFile('video.webm', new Uint8Array(webmBuffer));

    // Run FFmpeg command
    await ffmpeg.exec([
      '-i', 'video.webm',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      'output.mp4'
    ]);

    // Read the output file
    const mp4Data = await ffmpeg.readFile('output.mp4');
    const mp4Blob = new Blob([mp4Data], { type: 'video/mp4' });
    
    // Clean up files
    await ffmpeg.deleteFile('video.webm');
    await ffmpeg.deleteFile('output.mp4');

    // Create download link
    const url = URL.createObjectURL(mp4Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('FFmpeg error:', error);
    throw new Error('Failed to convert video');
  }
}