"use client";

import { useState } from "react";
import ImageCompressor from "browser-image-compression";

interface ImageUploaderProps {
  currentPhoto?: string | null;
  onPhotoChange: (path: string | null) => void;
}

export default function ImageUploader({ currentPhoto, onPhotoChange }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
    }
  }

  return (
    <div>
      <label className="block text-label text-fg-tertiary mb-1.5">Photo</label>
      {preview ? (
        <div className="relative rounded-sm overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          <button onClick={() => { setPreview(null); onPhotoChange(null); }} className="absolute top-2 right-2 bg-black/50 text-white rounded-sm px-2 py-1 text-micro hover:bg-black/70">Remove</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-sm p-6 cursor-pointer hover:border-primary/30 transition-colors bg-surface">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-black/15 border-t-primary rounded-full animate-spin" />
              <span className="text-caption text-fg-tertiary">Compressing...</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl mb-1">📷</div>
              <p className="text-caption text-fg-secondary">Tap to add photo</p>
              <p className="text-micro text-fg-quaternary mt-1">Auto-compresses to ~1MB</p>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} capture="environment" />
        </label>
      )}
      {error && <p className="text-danger text-micro mt-1">{error}</p>}
    </div>
  );
}
