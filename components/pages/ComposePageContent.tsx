"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { frames } from "@/app/data/frames";
import QRCode from "qrcode";

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

  // QR download flow state
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrImageSrc, setQrImageSrc] = useState<string | null>(null);
  const [qrDownloadUrl, setQrDownloadUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const uploadIdRef = useRef<string | null>(null);

  useEffect(() => {
    uploadIdRef.current = uploadId;
  }, [uploadId]);

  const resetQrState = useCallback(() => {
    setQrImageSrc(null);
    setQrDownloadUrl(null);
    setShowQrModal(false);
    setQrError(null);
  }, []);

  const deleteUpload = useCallback(async (id: string | null) => {
    if (!id) return;
    try {
      await fetch(`/api/uploads/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to clean up uploaded image", error);
    }
  }, []);

  const cleanupUpload = useCallback(async () => {
    const currentId = uploadIdRef.current;
    if (!currentId) return;
    uploadIdRef.current = null;
    setUploadId(null);
    await deleteUpload(currentId);
  }, [deleteUpload]);

  useEffect(() => {
    return () => {
      if (uploadIdRef.current) {
        // Fire-and-forget cleanup when navigation leaves this page
        fetch(`/api/uploads/${uploadIdRef.current}`, { method: "DELETE" }).catch(
          () => {}
        );
      }
    };
  }, []);

  useEffect(() => {
    // Dynamically set overlay options based on frame layout
    let overlays: { name: string; file: string }[] = [];
    if (selectedFrame?.layout === "vertical") {
      overlays = [
        { name: "Y2K", file: "vertical-y2k.svg" },
        { name: "CUTESY", file: "vertical-cutesy.svg" },
        { name: "MINECRAFT", file: "vertical-minecraft.svg" },
        { name: "RETRO COMICS", file: "vertical-comic.svg" },
        { name: "ONE PIECE", file: "vertical-one-piece.png" },
        { name: "DAYDREAM", file: "vertical-daydream.png" },
      ];
    } else if (selectedFrame?.layout === "horizontal") {
      overlays = [
        { name: "CLASSIC", file: "quad-classic.png" },
        { name: "CLASSIC 2", file: "quad-classic2.png" },
        { name: "CLASSIC 3", file: "quad-classic3.png" },
        { name: "CLASSIC 4", file: "quad-classic4.png" },
        { name: "Y2K", file: "quad-y2k.png" },
        { name: "MINECRAFT", file: "quad-minecraft.png" },
        { name: "RETRO COMIC", file: "quad-comic.png" },
        { name: "ONE PIECE", file: "quad-one-piece.png" },
      ];
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

  useEffect(() => {
    if (!composedImage) return;
    resetQrState();
    cleanupUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composedImage]);

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

  const handleShowQr = async () => {
    if (!composedImage || isGeneratingQr) return;

    setIsGeneratingQr(true);
    setQrError(null);

    try {
      let currentId = uploadIdRef.current;
      if (!currentId) {
        const response = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: composedImage }),
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { id: string; url: string };
        currentId = payload.id;
        setUploadId(currentId);
      }

      if (!currentId) {
        throw new Error("Unable to determine upload id");
      }

      const origin = window.location.origin;
      const downloadUrl = `${origin}/api/uploads/${currentId}`;
      setQrDownloadUrl(downloadUrl);
      const qrSrc = await QRCode.toDataURL(downloadUrl, {
        margin: 1,
        width: 320,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      setQrImageSrc(qrSrc);
      setShowQrModal(true);
    } catch (error) {
      console.error("Failed to generate QR code", error);
      setQrError("We couldn't generate the QR code. Please try again.");
      await cleanupUpload();
      resetQrState();
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleCloseQrModal = () => {
    setShowQrModal(false);
  };

  const handleConfirmQrDownload = async () => {
    await cleanupUpload();
    resetQrState();
  };

  const handleRetake = () => {
    resetQrState();
    cleanupUpload().finally(() => {
      router.push("/frames");
    });
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

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={handleDownload}
            disabled={!composedImage}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg shadow-lg transition-all duration-300"
          >
            Download Photos
          </button>
          <button
            onClick={handleShowQr}
            disabled={!composedImage || isGeneratingQr}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white rounded-lg shadow-lg transition-all duration-300"
          >
            {isGeneratingQr ? "Preparing QR..." : "Download via QR"}
          </button>
          <button
            onClick={handleRetake}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-300"
          >
            Take New Photos
          </button>
        </div>

        {qrError && (
          <p className="mt-4 text-center text-red-400">{qrError}</p>
        )}
      </div>

      {showQrModal && qrImageSrc && qrDownloadUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl bg-[#1b1230] p-6 text-center shadow-2xl border border-purple-700/40">
            <h2 className="text-2xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">
              Scan to Download
            </h2>
            <div className="mx-auto mb-4 w-60 h-60 rounded-xl bg-white p-4 flex items-center justify-center">
              <Image
                src={qrImageSrc}
                alt="QR code"
                width={224}
                height={224}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm text-purple-200/80 mb-6 break-all">
              {qrDownloadUrl}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmQrDownload}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg transition-all duration-300"
              >
                Mark as Downloaded
              </button>
              <button
                onClick={handleCloseQrModal}
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
