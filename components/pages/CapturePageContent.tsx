"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { frames } from "@/app/data/frames";

export default function CapturePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const frameId = searchParams.get("frameId");
  const selectedFrame = frames.find((f) => f.id === frameId);
  const totalSlots = selectedFrame?.slots || 4; // Default to 4 if frame not found

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  // 1) set up camera once with improved constraints
  useEffect(() => {
    let stream: MediaStream;

    const setupCamera = async () => {
      try {
        // First define preferred orientation based on frame layout
        const frameAspect =
          selectedFrame?.layout === "horizontal" ? "landscape" : "portrait";
        const isDeviceMobile = /iPhone|iPad|iPod|Android/i.test(
          navigator.userAgent
        );

        // Base constraints with high quality
        let constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
          audio: false,
        };

        // For mobile, we need to be more specific about orientation
        if (isDeviceMobile) {
          // Set aspectRatio constraint based on frame type
          const aspectRatio = frameAspect === "landscape" ? 16 / 9 : 9 / 16;
          setIsLandscape(frameAspect === "landscape");

          constraints = {
            video: {
              width: { ideal: frameAspect === "landscape" ? 1920 : 1080 },
              height: { ideal: frameAspect === "landscape" ? 1080 : 1920 },
              facingMode: "user",
              aspectRatio: { ideal: aspectRatio },
            },
            audio: false,
          };
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Wait for video to load metadata to ensure proper dimensions
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              // Check actual video dimensions to determine if it's landscape
              const actualRatio =
                videoRef.current.videoWidth / videoRef.current.videoHeight;
              setIsLandscape(actualRatio > 1);
              setIsCameraReady(true);
            }
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        // Try fallback constraints if initial attempt fails
        try {
          const fallbackConstraints = {
            video: { facingMode: "user" },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(
            fallbackConstraints
          );
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraReady(true);
          }
        } catch (fallbackErr) {
          console.error("Fallback camera access failed:", fallbackErr);
        }
      }
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedFrame]);

  // 2) core countdown logic
  const startCountdown = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    let count = 3;
    setCountdown(count);

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        takePhoto();
        setIsCapturing(false);
      }
    }, 1000);
  };

  // 3) capture a single photo with orientation handling
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isLandscape) {
      // For landscape mode: flip horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // For portrait mode: flip horizontally but keep orientation
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Convert to high-quality JPEG
    const data = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedPhotos((prev) => [...prev, data]);
  };

  // 4) when we have just taken one (and still need more), schedule the next
  useEffect(() => {
    if (capturedPhotos.length > 0 && capturedPhotos.length < totalSlots) {
      const t = setTimeout(startCountdown, 1500);
      return () => clearTimeout(t);
    }
  }, [capturedPhotos.length, totalSlots]);

  // 5) entry point for the very first shot
  const handleStart = () => {
    if (capturedPhotos.length === 0) {
      startCountdown();
    }
  };

  // 6) once we're done, move on and store orientation data
  const handleComplete = () => {
    if (!frameId || capturedPhotos.length !== totalSlots) return;
    // Store photos and their orientation in localStorage
    try {
      localStorage.setItem(
        "nocturne-photos",
        JSON.stringify({
          photos: capturedPhotos,
          isLandscape: isLandscape,
        })
      );
      router.push(`/compose?frameId=${frameId}`);
    } catch (error) {
      console.error("Error saving photos:", error);
      // TODO: Show error message to user
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Take Your Photos ({capturedPhotos.length}/{totalSlots})
        </h1>

        <div
          className={`relative ${
            isLandscape ? "aspect-video" : "aspect-[9/16]"
          } mb-8 rounded-lg overflow-hidden bg-black`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
          <canvas ref={canvasRef} className="hidden" />
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-8xl font-bold text-white animate-pulse">
                {countdown || "SMILE!"}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4">
          {capturedPhotos.length === 0 ? (
            <button
              onClick={handleStart}
              disabled={!isCameraReady || isCapturing}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg shadow-lg transition-all duration-300"
            >
              Start Taking Photos
            </button>
          ) : capturedPhotos.length < totalSlots ? (
            <div className="text-center">
              <p className="mb-4 text-lg">
                {isCapturing ? "Taking photo..." : "Get ready for next photo!"}
              </p>
            </div>
          ) : (
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg transition-all duration-300"
            >
              Complete
            </button>
          )}
        </div>

        {capturedPhotos.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {capturedPhotos.map((p, i) => (
              <div
                key={i}
                className={`${
                  isLandscape ? "aspect-video" : "aspect-[9/16]"
                } rounded-lg overflow-hidden`}
              >
                <img
                  src={p}
                  alt={`Captured ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
