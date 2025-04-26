"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { frames } from "@/app/data/frames";

export default function ComposePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const frameId = searchParams.get("frameId");
  const [composedImage, setComposedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedFrame = frames.find((f) => f.id === frameId);

  // Overlay selection state
  const [selectedOverlay, setSelectedOverlay] = useState<string>("");
  const [overlayOptions, setOverlayOptions] = useState<
    { name: string; file: string }[]
  >([]);

  // Store photos in state so overlay changes can always re-compose
  const [photos, setPhotos] = useState<string[]>([]);

  // Orientation information
  const [isLandscape, setIsLandscape] = useState(true);

  // Track if initial compose is done
  const [initialComposed, setInitialComposed] = useState(false);

  useEffect(() => {
    // Dynamically set overlay options based on frame layout
    let overlays: { name: string; file: string }[] = [];
    if (selectedFrame?.layout === "vertical") {
      overlays = [
        { name: "Y2K", file: "vertical-overlay.svg" },
        { name: "CUTESY", file: "vertical-overlay2.svg" },
        { name: "MINECRAFT", file: "vertical-overlay3.svg" },
        { name: "RETRO COMICS", file: "vertical-overlay4.svg" },
      ];
    } else if (selectedFrame?.layout === "horizontal") {
      overlays = [];
      // Add horizontal overlays here if you add any in the future
    }
    setOverlayOptions(overlays);
    // Try to get overlay from localStorage if present
    try {
      const stored = localStorage.getItem("nocturne-photos");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.overlay && overlays.some((o) => o.file === parsed.overlay)) {
          setSelectedOverlay(parsed.overlay);
          return;
        }
      }
    } catch {}
    setSelectedOverlay(overlays[0]?.file || "");
  }, [selectedFrame]);

  useEffect(() => {
    const initCompose = async () => {
      if (!frameId) {
        router.push("/frames");
        return;
      }

      try {
        const stored = localStorage.getItem("nocturne-photos");
        let loadedPhotos: string[] = [];
        let overlayFromStorage = "";
        let storedIsLandscape = true;

        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.photos)) {
            loadedPhotos = parsed.photos;
          } else if (Array.isArray(parsed)) {
            loadedPhotos = parsed;
          }

          // Get orientation information if available
          if (typeof parsed.isLandscape === "boolean") {
            storedIsLandscape = parsed.isLandscape;
            setIsLandscape(storedIsLandscape);
          }

          if (parsed.overlay) overlayFromStorage = parsed.overlay;
        }

        if (
          (!loadedPhotos || loadedPhotos.length === 0 || !selectedFrame) &&
          !composedImage
        ) {
          router.push("/frames");
          return;
        }

        if (overlayFromStorage && overlayFromStorage !== selectedOverlay) {
          setSelectedOverlay(overlayFromStorage);
        }

        if (loadedPhotos && loadedPhotos.length > 0) {
          setPhotos(loadedPhotos);
          await composePhotos(loadedPhotos, storedIsLandscape);
        }

        // Only clean up localStorage after first compose
        if (!initialComposed && loadedPhotos && loadedPhotos.length > 0) {
          localStorage.removeItem("nocturne-photos");
          setInitialComposed(true);
        }
      } catch (error) {
        console.error("Error retrieving photos:", error);
        if (!composedImage) router.push("/frames");
      }
    };

    // Only re-run on overlay/frameId/selectedFrame change, but only remove photos on first run
    initCompose();
    // eslint-disable-next-line
  }, [frameId, selectedFrame, router]);

  // Re-compose when overlay changes
  useEffect(() => {
    if (photos.length > 0 && selectedFrame) {
      composePhotos(photos, isLandscape);
    }
    // eslint-disable-next-line
  }, [selectedOverlay, selectedFrame]);

  const composePhotos = async (photos: string[], photoIsLandscape: boolean) => {
    if (!canvasRef.current || !selectedFrame) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size based on frame layout
    if (selectedFrame.layout === "horizontal") {
      canvas.width = 1800;
      canvas.height = 1200;
    } else if (selectedFrame.id === "vertical-narrow") {
      canvas.width = 600;
      canvas.height = 1500;
    } else {
      canvas.width = 1050;
      canvas.height = 1800; // Adjusted for better vertical proportion
    }

    // Fill white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load the frame image
    const frameImage = new window.Image() as HTMLImageElement;
    frameImage.src = selectedFrame.imagePath;
    await new Promise((resolve) => {
      frameImage.onload = resolve;
    });

    // Draw frame
    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

    // Define photo slots based on layout and frame type
    const photoSlots =
      selectedFrame.id === "vertical-narrow"
        ? [
            { x: 40, y: 55, width: 520, height: 300 },
            { x: 40, y: 375, width: 520, height: 300 },
            { x: 40, y: 695, width: 520, height: 300 },
            { x: 40, y: 1015, width: 520, height: 300 },
          ]
        : selectedFrame.layout === "vertical"
        ? [
            { x: 125, y: 90, width: 800, height: 350 },
            { x: 125, y: 460, width: 800, height: 350 },
            { x: 125, y: 830, width: 800, height: 350 },
            { x: 125, y: 1200, width: 800, height: 350 },
          ]
        : selectedFrame.layout === "grid"
        ? [
            { x: 90, y: 90, width: 495, height: 495 },
            { x: 615, y: 90, width: 495, height: 495 },
            { x: 90, y: 615, width: 495, height: 495 },
            { x: 615, y: 615, width: 495, height: 495 },
          ]
        : selectedFrame.layout === "horizontal"
        ? [
            { x: 90, y: 90, width: 800, height: 450 },
            { x: 910, y: 90, width: 800, height: 450 },
            { x: 90, y: 560, width: 800, height: 450 },
            { x: 910, y: 560, width: 800, height: 450 },
          ]
        : [];

    await Promise.all(
      photos.map(async (photoUrl, index) => {
        if (index >= photoSlots.length) return;

        const img = new window.Image() as HTMLImageElement;
        img.src = photoUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const slot = photoSlots[index];

        // Calculate dimensions to maintain aspect ratio
        const imgAspectRatio = img.width / img.height;
        const slotAspectRatio = slot.width / slot.height;

        let drawWidth = slot.width;
        let drawHeight = slot.height;
        let drawX = slot.x;
        let drawY = slot.y;

        // Check if the photo orientation matches what we expect for this frame
        const photoOrientationMatches =
          (photoIsLandscape && selectedFrame.layout === "horizontal") ||
          (!photoIsLandscape && selectedFrame.layout === "vertical");

        if (photoOrientationMatches) {
          // Standard aspect ratio handling
          if (imgAspectRatio > slotAspectRatio) {
            // Image is wider than slot
            drawHeight = slot.width / imgAspectRatio;
            drawY = slot.y + (slot.height - drawHeight) / 2;
          } else {
            // Image is taller than slot
            drawWidth = slot.height * imgAspectRatio;
            drawX = slot.x + (slot.width - drawWidth) / 2;
          }
        } else {
          // Handle mismatch - we need to center and crop
          if (imgAspectRatio < 1 && slotAspectRatio > 1) {
            // Portrait photo in landscape slot - center horizontally
            drawHeight = slot.height;
            drawWidth = slot.height * imgAspectRatio;
            drawX = slot.x + (slot.width - drawWidth) / 2;
          } else if (imgAspectRatio > 1 && slotAspectRatio < 1) {
            // Landscape photo in portrait slot - center vertically
            drawWidth = slot.width;
            drawHeight = slot.width / imgAspectRatio;
            drawY = slot.y + (slot.height - drawHeight) / 2;
          }
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      })
    );

    // Overlay logic
    let overlayPath = null;
    if (selectedOverlay) {
      if (selectedFrame?.layout === "vertical") {
        overlayPath = `/overlay/vertical/${selectedOverlay}`;
      } else if (selectedFrame?.layout === "horizontal") {
        overlayPath = `/overlay/quad/${selectedOverlay}`;
      }
    }
    if (overlayPath) {
      const overlayImg = new window.Image();
      overlayImg.src = overlayPath;
      await new Promise((resolve) => {
        overlayImg.onload = resolve;
      });
      ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    }

    setComposedImage(canvas.toDataURL("image/jpeg", 0.9)); // Increased quality
  };

  const handleDownload = () => {
    if (!composedImage) return;

    const link = document.createElement("a");
    link.download = "nocturne-booth-photos.jpg";
    link.href = composedImage;
    link.click();
  };

  const handleRetake = () => {
    router.push("/frames");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">
          Your Photos Are Ready!
        </h1>

        {/* Overlay selector for vertical or horizontal frames */}
        {(selectedFrame?.layout === "vertical" ||
          selectedFrame?.layout === "horizontal") &&
          overlayOptions.length > 0 && (
            <div className="mb-4 flex justify-center">
              <label htmlFor="overlay-select" className="mr-2">
                Choose Overlay:
              </label>
              <select
                id="overlay-select"
                value={selectedOverlay}
                onChange={(e) => setSelectedOverlay(e.target.value)}
                className="text-white rounded px-2 py-1"
              >
                {overlayOptions.map((overlay) => (
                  <option key={overlay.file} value={overlay.file}>
                    {overlay.name}
                  </option>
                ))}
              </select>
            </div>
          )}

        <div
          className={`relative ${
            selectedFrame?.layout === "horizontal"
              ? "aspect-[3/2]"
              : "aspect-[2/3]"
          } mb-8 rounded-lg overflow-hidden bg-black/30 mx-auto max-w-2xl`}
        >
          <canvas ref={canvasRef} className="hidden" />
          {composedImage && (
            <Image
              src={composedImage}
              alt="Composed photos"
              fill
              className="object-contain"
              priority
            />
          )}
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleDownload}
            disabled={!composedImage}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg shadow-lg transition-all duration-300"
          >
            Download Photos
          </button>
          <button
            onClick={handleRetake}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-300"
          >
            Take New Photos
          </button>
        </div>
      </div>
    </main>
  );
}
