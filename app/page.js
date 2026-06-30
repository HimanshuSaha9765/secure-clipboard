"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export default function Home() {
  // ─── State ───
  const [activeTab, setActiveTab] = useState("create");
  const [inputType, setInputType] = useState("text");
  const [textValue, setTextValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Retrieve State
  const [retrieveCode, setRetrieveCode] = useState("");
  const [retrieveResult, setRetrieveResult] = useState(null);
  const [retrieveError, setRetrieveError] = useState("");
  const [retrieveLoading, setRetrieveLoading] = useState(false);
  const [retrieveTimeLeft, setRetrieveTimeLeft] = useState(null);

  const fileInputRef = useRef(null);
  const MAX_FILES = 10;

  // ─── Toast System ───
  const addToast = (message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // ─── Countdown Timers ───
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!retrieveTimeLeft || retrieveTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setRetrieveTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retrieveTimeLeft]);

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return "EXPIRED";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // ─── Handle Files (shared logic) ───
  const handleNewFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles);
    const maxMB = 4.5;

    setSelectedFiles((prev) => {
      const totalSlots = MAX_FILES - prev.length;

      if (totalSlots <= 0) {
        addToast(
          `Maximum ${MAX_FILES} files allowed. No more files can be added.`,
        );
        return prev;
      }

      const accepted = fileArray.slice(0, totalSlots);
      const rejected = fileArray.slice(totalSlots);

      if (rejected.length > 0) {
        rejected.forEach((f) => {
          addToast(`❌ ${f.name} — Skipped (max ${MAX_FILES} files)`);
        });
      }

      return [...prev, ...accepted];
    });

    setError("");
  }, []);

  // ─── Drag & Drop ───
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (inputType !== "file") return;
      const files = e.dataTransfer.files;
      if (files && files.length > 0) handleNewFiles(files);
    },
    [inputType, handleNewFiles],
  );

  // ─── Paste Detection ───
  useEffect(() => {
    const handlePaste = (e) => {
      if (activeTab !== "create" || inputType !== "file") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        handleNewFiles(files);
        e.preventDefault();
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab, inputType, handleNewFiles]);

  // ─── Remove a file ───
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Create Clip ───
  // ─── Create Clip ───
  const handleCreate = async () => {
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      // ─── Pre-flight size check (BEFORE upload) ───
      const VERCEL_LIMIT = 4.5 * 1024 * 1024; // 4.5MB

      if (inputType === "text") {
        if (!textValue.trim()) {
          setError("Please enter some text");
          setIsLoading(false);
          return;
        }
        // Text size check (UTF-8 byte length)
        const textBytes = new Blob([textValue]).size;
        if (textBytes > VERCEL_LIMIT) {
          setError(
            `Text too large (${(textBytes / 1024 / 1024).toFixed(2)}MB). Maximum is 4.5MB.`,
          );
          setIsLoading(false);
          return;
        }
      } else {
        if (selectedFiles.length === 0) {
          setError("Please select files");
          setIsLoading(false);
          return;
        }

        // Calculate total upload size
        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

        if (totalSize > VERCEL_LIMIT) {
          const totalMB = (totalSize / 1024 / 1024).toFixed(2);
          setError(
            `Total file size is ${totalMB}MB. Public sharing limit is 4.5MB. ` +
              `Please remove some files or upload them separately.`,
          );
          setIsLoading(false);
          return;
        }

        // Check each file individually
        const oversizedFile = selectedFiles.find((f) => f.size > VERCEL_LIMIT);
        if (oversizedFile) {
          setError(
            `"${oversizedFile.name}" is larger than 4.5MB. Please remove it.`,
          );
          setIsLoading(false);
          return;
        }
      }

      // ─── Build FormData ───
      const formData = new FormData();

      if (inputType === "text") {
        formData.append("type", "text");
        formData.append("content", textValue);
      } else {
        if (selectedFiles.length === 1) {
          formData.append("type", "file");
          formData.append("file", selectedFiles[0]);
        } else {
          formData.append("type", "bulk");
          selectedFiles.forEach((file) => formData.append("files", file));
        }
      }

      // ─── Send Request ───
      const response = await fetch("/api/clip", {
        method: "POST",
        body: formData,
      });

      // ─── Handle Response Safely ───
      // Always check response type before parsing JSON
      const contentType = response.headers.get("content-type");

      // Handle 413 (Request Entity Too Large) — returns plain text, not JSON
      if (response.status === 413) {
        throw new Error("Upload too large. Total size must be under 4.5MB.");
      }

      // If not JSON, it's a server error (not our app)
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          response.status === 413
            ? "Upload too large. Maximum total size is 4.5MB."
            : "Server error. Please try again with smaller files.",
        );
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.rejected && data.rejected.length > 0) {
          data.rejected.forEach((r) => addToast(`❌ ${r.reason}`));
        }
        throw new Error(data.error || "Something went wrong");
      }

      if (data.rejectedFiles && data.rejectedFiles.length > 0) {
        data.rejectedFiles.forEach((r) =>
          addToast(`⚠️ ${r.reason}`, "warning"),
        );
      }

      setResult({
        id: data.id,
        code: data.code,
        expiresAt: data.expiresAt,
        link: `${window.location.origin}/clip/${data.id}`,
        acceptedCount: data.acceptedCount,
      });
      setTimeLeft(data.expiresAt - Date.now());
      setTextValue("");
      setSelectedFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  // ─── Retrieve ───
  const handleRetrieve = async () => {
    if (!retrieveCode.trim()) return;
    setRetrieveLoading(true);
    setRetrieveError("");
    setRetrieveResult(null);

    try {
      const response = await fetch("/api/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: retrieveCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Invalid or expired code");

      setRetrieveResult({
        type: data.clip.type,
        content: data.clip.content,
        fileName: data.clip.fileName,
        fileType: data.clip.fileType,
        fileSize: data.clip.fileSize,
        files: data.clip.files,
        fileCount: data.clip.fileCount,
      });
      setRetrieveTimeLeft(data.remainingMs);
    } catch (err) {
      setRetrieveError(err.message);
    } finally {
      setRetrieveLoading(false);
    }
  };

  // Feature #4: Enter key triggers retrieve
  const handleRetrieveKeyDown = (e) => {
    if (e.key === "Enter") handleRetrieve();
  };

  // ─── Helpers ───
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast("✅ Copied to clipboard!", "success");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      addToast("✅ Copied to clipboard!", "success");
    }
  };

  const downloadFile = (base64, fileName, fileType) => {
    const link = document.createElement("a");
    link.href = `data:${fileType};base64,${base64}`;
    link.download = fileName;
    link.click();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "32px" }}
    >
      {/* ─── Toast Container ─── */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "400px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-in"
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              backgroundColor:
                toast.type === "success"
                  ? "#dcfce7"
                  : toast.type === "warning"
                    ? "#fef9c3"
                    : "#fee2e2",
              color:
                toast.type === "success"
                  ? "#166534"
                  : toast.type === "warning"
                    ? "#854d0e"
                    : "#991b1b",
              border: `1px solid ${toast.type === "success" ? "#bbf7d0" : toast.type === "warning" ? "#fde68a" : "#fecaca"}`,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* ─── Header ─── */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          📋 Secure Clipboard
        </h1>
        <p style={{ color: "var(--secondary)" }}>
          Share text and files securely • Auto-expires in 10 minutes
        </p>
      </div>

      {/* ─── Tabs ─── */}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
        <button
          onClick={() => setActiveTab("create")}
          className={`tab-button ${activeTab === "create" ? "active" : "inactive"}`}
        >
          ✏️ Create Clip
        </button>
        <button
          onClick={() => setActiveTab("retrieve")}
          className={`tab-button ${activeTab === "retrieve" ? "active" : "inactive"}`}
        >
          🔍 Retrieve
        </button>
      </div>

      {/* ═══ CREATE TAB ═══ */}
      {activeTab === "create" && (
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          <div
            style={{ display: "flex", justifyContent: "center", gap: "16px" }}
          >
            <button
              onClick={() => setInputType("text")}
              className={`type-button ${inputType === "text" ? "active" : "inactive"}`}
            >
              📝 Text
            </button>
            <button
              onClick={() => setInputType("file")}
              className={`type-button ${inputType === "file" ? "active" : "inactive"}`}
            >
              📎 Files
            </button>
          </div>

          {inputType === "text" && (
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Paste or type your text here..."
              className="input-field"
              style={{ height: "192px", resize: "none" }}
              disabled={isLoading}
            />
          )}

          {inputType === "file" && (
            <div>
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`drop-zone ${isDragging ? "active" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > MAX_FILES) {
                      addToast(
                        `Maximum ${MAX_FILES} files. Only first ${MAX_FILES} selected.`,
                      );
                    }
                    handleNewFiles(e.target.files);
                    e.target.value = "";
                  }}
                  disabled={isLoading}
                />
                <div>
                  <p style={{ fontSize: "2.5rem", marginBottom: "8px" }}>
                    {isDragging ? "📥" : selectedFiles.length > 0 ? "✅" : "📁"}
                  </p>
                  <p style={{ fontWeight: "500" }}>
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                      : "Drag & drop, paste (Ctrl+V), or click to upload"}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--secondary)",
                      marginTop: "4px",
                    }}
                  >
                    Max 10 files • Total max 4.5MB • All file types
                  </p>
                </div>
              </div>

              {/* File List */}
              {selectedFiles.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: "500",
                            fontSize: "14px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📄 {file.name}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--secondary)",
                          }}
                        >
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--error)",
                          cursor: "pointer",
                          fontSize: "18px",
                          padding: "4px 8px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--secondary)",
                      textAlign: "right",
                    }}
                  >
                    Total: {formatFileSize(totalSize)} / 4.5 MB •{" "}
                    {selectedFiles.length}/{MAX_FILES} files
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              className="badge-error"
              style={{ textAlign: "center", display: "block" }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            {isLoading ? "🔄 Processing..." : "🚀 Generate Link"}
          </button>

          {result && (
            <div
              className="result-box success"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {result.acceptedCount && (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--success)",
                    fontWeight: "500",
                  }}
                >
                  ✅ {result.acceptedCount} file
                  {result.acceptedCount > 1 ? "s" : ""} uploaded!
                </p>
              )}
              <div>
                <p style={{ fontWeight: "500", marginBottom: "8px" }}>
                  🔗 Share Link:
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={result.link}
                    readOnly
                    className="input-field"
                    style={{ fontSize: "14px" }}
                  />
                  <button
                    onClick={() => copyToClipboard(result.link)}
                    className="btn-secondary"
                    style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              <div>
                <p style={{ fontWeight: "500", marginBottom: "8px" }}>
                  🔢 Retrieval Code:
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={result.code}
                    readOnly
                    className="input-field"
                    style={{
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontSize: "1.5rem",
                      letterSpacing: "0.2em",
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(result.code)}
                    className="btn-secondary"
                    style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              {timeLeft !== null && timeLeft > 0 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--secondary)" }}>
                    ⏳ Expires in:
                  </p>
                  <p className="countdown">{formatTime(timeLeft)}</p>
                </div>
              )}
              {timeLeft !== null && timeLeft <= 0 && (
                <div style={{ textAlign: "center" }}>
                  <p className="badge-error">⏰ This clip has expired</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ RETRIEVE TAB ═══ */}
      {activeTab === "retrieve" && (
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          <div>
            <label
              style={{
                fontWeight: "500",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Enter Retrieval Code:
            </label>
            <input
              type="text"
              value={retrieveCode}
              onChange={(e) =>
                setRetrieveCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={handleRetrieveKeyDown}
              placeholder="e.g., 847293"
              className="input-field"
              style={{
                textAlign: "center",
                fontFamily: "monospace",
                fontSize: "1.5rem",
                letterSpacing: "0.2em",
              }}
              maxLength={6}
              disabled={retrieveLoading}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>

          <button
            onClick={handleRetrieve}
            disabled={retrieveLoading || !retrieveCode.trim()}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            {retrieveLoading ? "🔄 Fetching..." : "🔍 Retrieve"}
          </button>

          {retrieveError && (
            <div
              className="badge-error"
              style={{ textAlign: "center", display: "block" }}
            >
              {retrieveError}
            </div>
          )}

          {retrieveResult && (
            <div
              className="result-box info"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {retrieveTimeLeft !== null && retrieveTimeLeft > 0 && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--secondary)" }}>
                    ⏳ Expires in:
                  </p>
                  <p
                    className="countdown"
                    style={
                      retrieveTimeLeft < 60000 ? { color: "var(--error)" } : {}
                    }
                  >
                    {formatTime(retrieveTimeLeft)}
                  </p>
                </div>
              )}

              {/* Text */}
              {retrieveResult.type === "text" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontWeight: "500" }}>📝 Text Content</span>
                    <button
                      onClick={() => copyToClipboard(retrieveResult.content)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "13px" }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="content-preview">
                    <pre>{retrieveResult.content}</pre>
                  </div>
                </div>
              )}

              {/* Single File */}
              {retrieveResult.type === "file" && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "3rem", marginBottom: "8px" }}>📄</p>
                  <p style={{ fontWeight: "500", fontSize: "1.1rem" }}>
                    {retrieveResult.fileName}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--secondary)",
                      marginTop: "4px",
                    }}
                  >
                    {formatFileSize(retrieveResult.fileSize)}
                  </p>
                  <button
                    onClick={() =>
                      downloadFile(
                        retrieveResult.content,
                        retrieveResult.fileName,
                        retrieveResult.fileType,
                      )
                    }
                    className="btn-primary"
                    style={{ marginTop: "16px" }}
                  >
                    ⬇️ Download
                  </button>
                </div>
              )}

              {/* Bulk Files */}
              {retrieveResult.type === "bulk" && retrieveResult.files && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <p style={{ fontWeight: "500", textAlign: "center" }}>
                    📦 {retrieveResult.fileCount} Files
                  </p>
                  {retrieveResult.files.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        borderRadius: "8px",
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: "500", fontSize: "14px" }}>
                          📄 {file.fileName}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--secondary)",
                          }}
                        >
                          {formatFileSize(file.fileSize)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          downloadFile(
                            file.content,
                            file.fileName,
                            file.fileType,
                          )
                        }
                        className="btn-secondary"
                        style={{ padding: "8px 12px", fontSize: "13px" }}
                      >
                        ⬇️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin Link */}
      <div style={{ textAlign: "center" }}>
        <a href="/admin" className="link-subtle">
          🔐 Admin Access
        </a>
      </div>
    </div>
  );
}
