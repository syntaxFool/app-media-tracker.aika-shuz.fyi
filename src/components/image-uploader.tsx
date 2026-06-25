"use client";

import { useState, useRef } from "react";
import ImageCompressor from "browser-image-compression";
import { Camera, Image as ImageIcon, X } from "lucide-react";

interface ImageUploaderProps {
  currentPhoto?: string | null;
  onPhotoChange: (path: string | null) => void;
}

export default function ImageUploader({ currentPhoto, onPhotoChange }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError("");
    try {
      const compressed = await ImageCompressor(file, {
        maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, fileType: "image/jpeg",
      });
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(compressed);

      setUploading(true);
      const formData = new FormData();
      formData.append("file", compressed, compressed.name || file.name);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); return; }
      onPhotoChange(data.path);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setShowPicker(false);
    }
  }

  function handleCameraFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleGalleryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleRemove() {
    setPreview(null);
    onPhotoChange(null);
  }

  return (
    <div>
      <label className="block text-label text-fg-tertiary dark:text-gray-400 mb-1.5">Photo</label>

      {preview ? (
        <div className="relative rounded-sm overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          <button onClick={handleRemove} className="absolute top-2 right-2 bg-black/50 text-white rounded-sm px-2 py-1 text-micro hover:bg-black/70 flex items-center gap-1">
            <X className="w-3 h-3" /> Remove
          </button>
        </div>
      ) : showPicker ? (
        <div className="border-2 border-dashed border-border dark:border-gray-700 rounded-sm p-4 animate-fade-in bg-white dark:bg-gray-800">
          <div className="flex gap-3">
            {/* Camera */}
            <label className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-sm bg-white dark:bg-gray-900 border border-border dark:border-gray-600 cursor-pointer hover:border-primary/30 transition-colors active:bg-surface dark:active:bg-gray-700">
              <Camera className="w-5 h-5 text-fg-secondary dark:text-gray-300" />
              <span className="text-caption font-[510] text-fg-primary dark:text-gray-200">Take Photo</span>
              <input ref={cameraInputRef} type="file" accept="image/*" onChange={handleCameraFile} className="hidden" capture="environment" />
            </label>

            {/* Gallery */}
            <label className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-sm bg-white dark:bg-gray-900 border border-border dark:border-gray-600 cursor-pointer hover:border-primary/30 transition-colors active:bg-surface dark:active:bg-gray-700">
              <ImageIcon className="w-5 h-5 text-fg-secondary dark:text-gray-300" />
              <span className="text-caption font-[510] text-fg-primary dark:text-gray-200">Gallery</span>
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleGalleryFile} className="hidden" />
            </label>
          </div>
          <button onClick={() => setShowPicker(false)} className="mt-3 w-full text-center text-micro text-fg-quaternary hover:text-fg-secondary transition-colors">Cancel</button>
        </div>
      ) : uploading ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border dark:border-gray-700 rounded-sm p-6 bg-surface dark:bg-gray-800">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-white/15 border-t-primary rounded-full animate-spin" />
            <span className="text-caption text-fg-tertiary dark:text-gray-400">Compressing...</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-full flex flex-col items-center justify-center border-2 border-dashed border-border dark:border-gray-700 rounded-sm p-6 cursor-pointer hover:border-primary/30 transition-colors bg-surface dark:bg-gray-800"
        >
          <div className="text-center">
            <div className="text-2xl mb-1">📷</div>
            <p className="text-caption text-fg-secondary dark:text-gray-300">Tap to add photo</p>
            <p className="text-micro text-fg-quaternary dark:text-gray-500 mt-1">Auto-compresses to ~1MB</p>
          </div>
        </button>
      )}

      {error && <p className="text-danger text-micro mt-1">{error}</p>}
    </div>
  );
}
