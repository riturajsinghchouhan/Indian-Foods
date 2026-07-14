import { toast } from "sonner";

const DOWNLOAD_TOAST_ID = "file-download";

const isFlutterWebView = () =>
  typeof window !== "undefined" &&
  window.flutter_inappwebview &&
  typeof window.flutter_inappwebview.callHandler === "function";

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });

const triggerAnchorDownload = (href, filename) => {
  const link = document.createElement("a");
  link.href = href;
  link.setAttribute("download", filename);
  link.rel = "noopener";
  link.style.visibility = "hidden";
  link.style.position = "absolute";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * Prefer native Flutter handlers when available (no blob: URL needed).
 */
const tryFlutterBase64Download = async ({ base64, filename, mimeType }) => {
  if (!isFlutterWebView()) return false;

  const rawBase64 = String(base64).includes(",")
    ? String(base64).split(",")[1]
    : String(base64);

  const payload = {
    base64: rawBase64,
    data: rawBase64,
    base64Data: rawBase64,
    filename,
    fileName: filename,
    name: filename,
    mimeType,
    type: mimeType,
    contentType: mimeType,
  };

  // Keep this list short — missing handlers should fail fast; hanging ones time out.
  const handlerNames = ["downloadBase64File", "downloadFile", "blobToBase64Handler", "saveFile"];

  for (const handlerName of handlerNames) {
    try {
      const result = await Promise.race([
        window.flutter_inappwebview.callHandler(handlerName, payload),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 500)
        ),
      ]);

      if (result?.success === false || result === false) continue;
      console.log(`[DownloadUtils] Flutter handler succeeded: ${handlerName}`);
      return true;
    } catch (err) {
      console.warn(
        `[DownloadUtils] Flutter handler ${handlerName} unavailable:`,
        err?.message || err
      );
    }
  }

  try {
    await Promise.race([
      window.flutter_inappwebview.callHandler(
        "blobToBase64Handler",
        rawBase64,
        mimeType,
        filename
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 500)
      ),
    ]);
    console.log("[DownloadUtils] Flutter positional blobToBase64Handler succeeded");
    return true;
  } catch {
    // no-op
  }

  return false;
};

const tryWebShareDownload = async (blob, filename) => {
  try {
    if (!navigator.canShare) return false;
    const file = new File([blob], filename, {
      type: blob.type || "application/octet-stream",
    });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: filename });
    return true;
  } catch (err) {
    if (err?.name === "AbortError") return true;
    return false;
  }
};

/**
 * Trigger a blob download but KEEP the ObjectURL alive long enough for Flutter /
 * Android WebView download listeners that asynchronously `fetch(blobUrl)`.
 * Revoking at ~150ms caused: "Network error loading blob".
 */
const triggerBlobDownloadKeepAlive = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  triggerAnchorDownload(url, filename);
  setTimeout(() => {
    try {
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 60_000);
  return url;
};

/**
 * Robust file download for browser + Flutter InAppWebView.
 */
export const downloadFile = async ({
  data,
  filename,
  type,
  silent = false,
  successMessage = "Download started successfully",
}) => {
  console.log(`[DownloadUtils] Starting download: ${filename} (${type})`);

  const showSuccess = () => {
    if (!silent) toast.success(successMessage, { id: DOWNLOAD_TOAST_ID });
  };

  try {
    const mimeType = type || "application/octet-stream";
    const blob =
      data instanceof Blob
        ? data.type
          ? data
          : new Blob([data], { type: mimeType })
        : new Blob([data], { type: mimeType });

    // 1) Flutter base64 bridge (best when app implements a save handler)
    if (isFlutterWebView()) {
      try {
        const dataUrl = await blobToDataUrl(blob);
        const handledByFlutter = await tryFlutterBase64Download({
          base64: dataUrl,
          filename,
          mimeType: blob.type || mimeType,
        });
        if (handledByFlutter) {
          showSuccess();
          return true;
        }
      } catch (bridgeErr) {
        console.warn("[DownloadUtils] Flutter bridge download failed:", bridgeErr);
      }

      // 2) Existing Flutter download listeners fetch the blob: URL via injected JS.
      // Keep ObjectURL alive (do NOT revoke in 150ms).
      triggerBlobDownloadKeepAlive(blob, filename);
      showSuccess();
      console.log("[DownloadUtils] Flutter blob download triggered (keep-alive 60s)");
      return true;
    }

    // 3) Mobile browser share sheet
    const shared = await tryWebShareDownload(blob, filename);
    if (shared) {
      showSuccess();
      return true;
    }

    // 4) Standard browser download (also keep-alive for Android Chrome WebView)
    triggerBlobDownloadKeepAlive(blob, filename);
    showSuccess();
    console.log("[DownloadUtils] Download triggered");
    return true;
  } catch (error) {
    console.error("[DownloadUtils] Download failed:", error);
    if (!silent) {
      toast.error("Failed to download. Please try again.", { id: DOWNLOAD_TOAST_ID });
    }
    throw error;
  }
};
