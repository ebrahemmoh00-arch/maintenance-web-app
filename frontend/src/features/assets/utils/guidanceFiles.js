export function parseGuidanceFiles(value) {
  const source = value && typeof value === "object" ? value.guidance_file_url : value;
  const legacyName = value && typeof value === "object" ? value.guidance_file_name : "";
  const parsed = safeJson(source, null);
  const files = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.files) ? parsed.files : [];
  if (files.length) return normalizeGuidanceFiles(files);
  if (source) {
    return normalizeGuidanceFiles([{
      name: legacyName || "Guidance File",
      url: source
    }]);
  }
  return [];
}

export function serializeGuidanceFiles(files) {
  return JSON.stringify(normalizeGuidanceFiles(files));
}

export function guidanceFileNames(files) {
  return normalizeGuidanceFiles(files).map(file => file.name).join(", ");
}

export function readGuidanceFiles(fileList) {
  const files = Array.from(fileList || []);
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      url: String(reader.result || ""),
      type: file.type || "",
      size: file.size || 0
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

export function formatGuidanceFileSize(size) {
  const value = Number(size || 0);
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeGuidanceFiles(files) {
  return (Array.isArray(files) ? files : []).map((file, index) => ({
    name: String(file?.name || `Guidance File ${index + 1}`).trim(),
    url: String(file?.url || file?.href || "").trim(),
    type: String(file?.type || "").trim(),
    size: Number(file?.size || 0)
  })).filter(file => file.url);
}

function safeJson(value, fallback) {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
