import { Suspense } from "react";
import CapturePageContent from "@/components/pages/CapturePageContent";

export default function CapturePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-black text-white p-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Loading camera...</h2>
            <div className="w-16 h-16 border-t-4 border-purple-500 border-solid rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      }
    >
      <CapturePageContent />
    </Suspense>
  );
}
