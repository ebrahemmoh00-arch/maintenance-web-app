import { UploadCloud } from "lucide-react";
import { useEffect, useRef } from "react";

import { readFileAsDataUrl } from "../utils/workOrderForms.js";

export function SignaturePad({
  title,
  value,
  onChange,
  labels
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const ctx = canvas.getContext("2d");
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  function point(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: (source.clientX - rect.left) / rect.width * canvas.width,
      y: (source.clientY - rect.top) / rect.height * canvas.height
    };
  }

  function start(event) {
    event.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const p = point(event);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return <div className="border-b border-slate-950 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black">{title}</span>
        <button type="button" onClick={clear} className="rounded border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-red-600">{labels.clear}</button>
      </div>
      <canvas ref={canvasRef} width="520" height="120" className="h-24 w-full touch-none rounded border border-slate-300 bg-white" onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
    </div>;
}

export function PhotoUploader({
  title,
  photos,
  onChange,
  uploadLabel,
  emptyLabel = "No photos uploaded"
}) {
  async function handleFiles(files) {
    const next = await Promise.all(Array.from(files).map(readFileAsDataUrl));
    onChange([...photos, ...next].slice(0, 6));
  }

  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-950"><UploadCloud className="h-4 w-4 text-blue-700" />{title}</h3>
        <label className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
          {uploadLabel}
          <input type="file" accept="image/*" multiple className="hidden" onChange={event => handleFiles(event.target.files || [])} />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => <div key={index} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img src={photo} alt="" className="h-24 w-full object-cover" />
            <button type="button" onClick={() => onChange(photos.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-xs font-black text-red-600">x</button>
          </div>)}
        {!photos.length ? <div className="col-span-3 rounded-lg border border-dashed border-slate-300 bg-white py-8 text-center text-sm font-semibold text-slate-500">{emptyLabel}</div> : null}
      </div>
    </div>;
}
