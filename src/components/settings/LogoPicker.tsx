"use client";

import { Loader2, Image as ImageIcon, X } from "lucide-react";

// Resize & compress an image file to a small base64 data URL for storage as a company logo.
export function fileToLogoDataUrl(file: File, maxDim = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function LogoPicker({
  value, uploading, onPick, onClear,
}: {
  value?: string;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Logo" className="w-14 h-14 rounded-lg object-contain border border-gray-200 bg-white" />
      ) : (
        <div className="w-14 h-14 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
          <ImageIcon className="w-5 h-5" />
        </div>
      )}
      <label className="flex-1">
        <span className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pilih Gambar"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
      </label>
      {value && (
        <button type="button" onClick={onClear} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
