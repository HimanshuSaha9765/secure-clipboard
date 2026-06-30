"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [inputType, setInputType] = useState("text");
  const [textValue, setTextValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [sendError, setSendError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [sendProgress, setSendProgress] = useState("");

  const fileInputRef = useRef(null);
  const MAX_FILES = 10;

  const addToast = (message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      setIsLoggedIn(true);
      setUsername("");
      setPassword("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ─── File Handling (with paste support — Feature #3) ───
  const handleNewFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles);
    setSelectedFiles((prev) => {
      const totalSlots = MAX_FILES - prev.length;
      if (totalSlots <= 0) {
        addToast(`Maximum ${MAX_FILES} files allowed.`);
        return prev;
      }
      const accepted = fileArray.slice(0, totalSlots);
      const rejected = fileArray.slice(totalSlots);
      rejected.forEach((f) =>
        addToast(`❌ ${f.name} — Skipped (max ${MAX_FILES} files)`),
      );
      return [...prev, ...accepted];
    });
    setSendError("");
  }, []);

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
      if (e.dataTransfer.files?.length > 0)
        handleNewFiles(e.dataTransfer.files);
    },
    [handleNewFiles],
  );

  // Feature #3: Paste support for admin
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isLoggedIn || inputType !== "file") return;
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
  }, [isLoggedIn, inputType, handleNewFiles]);

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // ─── Send to Telegram (with smart queue — Feature #6) ───
  // ─── Send to Telegram ───
  const handleSend = async () => {
    setIsSending(true);
    setSendError("");
    setSendResult("");
    setSendProgress("");

    try {
      const VERCEL_LIMIT = 4.5 * 1024 * 1024;

      // ─── Pre-flight check ───
      if (inputType === "text") {
        if (!textValue.trim()) {
          setSendError("Please enter some text");
          setIsSending(false);
          return;
        }
        const textBytes = new Blob([textValue]).size;
        if (textBytes > VERCEL_LIMIT) {
          setSendError(
            `Text too large (${(textBytes / 1024 / 1024).toFixed(2)}MB). Max 4.5MB.`,
          );
          setIsSending(false);
          return;
        }
      } else {
        if (selectedFiles.length === 0) {
          setSendError("Please select files");
          setIsSending(false);
          return;
        }

        // Check each file individually (max 4.5MB per file)
        const oversizedFile = selectedFiles.find((f) => f.size > VERCEL_LIMIT);
        if (oversizedFile) {
          const fileMB = (oversizedFile.size / 1024 / 1024).toFixed(2);
          setSendError(
            `"${oversizedFile.name}" is ${fileMB}MB. Maximum per file is 4.5MB. Please remove it.`,
          );
          setIsSending(false);
          return;
        }

        // For bulk: if total > 4.5MB, send files ONE AT A TIME (smart queue)
        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

        if (selectedFiles.length > 1 && totalSize > VERCEL_LIMIT) {
          // ── SMART QUEUE: Send each file individually ──
          await sendFilesOneByOne();
          return;
        }
      }

      // ─── Normal Send (single request) ───
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
          setSendProgress(`Uploading ${selectedFiles.length} files...`);
          selectedFiles.forEach((file) => formData.append("files", file));
        }
      }

      const response = await fetch("/api/admin/send", {
        method: "POST",
        body: formData,
      });

      // Handle non-JSON response (413, 500, etc.)
      const contentType = response.headers.get("content-type");

      if (response.status === 413) {
        throw new Error("Upload too large. Try sending files individually.");
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          "Server error. Please try smaller files or send one at a time.",
        );
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setIsLoggedIn(false);
          throw new Error("Session expired. Please login again.");
        }
        throw new Error(data.error || "Failed to send");
      }

      setSendResult(data.message || "✅ Sent to Telegram!");

      if (data.failedFiles && data.failedFiles.length > 0) {
        data.failedFiles.forEach((f) => addToast(`❌ ${f.name}: ${f.reason}`));
      }
      if (data.sentFiles && data.sentFiles.length > 0) {
        data.sentFiles.forEach((name) =>
          addToast(`✅ ${name} sent`, "success"),
        );
      }

      setTextValue("");
      setSelectedFiles([]);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setIsSending(false);
      setSendProgress("");
    }
  };

  // ─── Smart Queue: Send files one by one (Feature #6) ───
  const sendFilesOneByOne = async () => {
    const totalFiles = selectedFiles.length;
    let successCount = 0;
    let failCount = 0;

    setSendProgress(`Smart queue: Sending ${totalFiles} files individually...`);
    addToast(
      `📦 Total size exceeds 4.5MB. Sending ${totalFiles} files one by one...`,
      "success",
    );

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setSendProgress(`Sending file ${i + 1} of ${totalFiles}: ${file.name}`);

      try {
        const formData = new FormData();
        formData.append("type", "file");
        formData.append("file", file);

        const response = await fetch("/api/admin/send", {
          method: "POST",
          body: formData,
        });

        const contentType = response.headers.get("content-type");

        if (response.status === 413) {
          addToast(`❌ ${file.name}: File too large`);
          failCount++;
          continue;
        }

        if (!contentType || !contentType.includes("application/json")) {
          addToast(`❌ ${file.name}: Server error`);
          failCount++;
          continue;
        }

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            setIsLoggedIn(false);
            throw new Error("Session expired. Please login again.");
          }
          addToast(`❌ ${file.name}: ${data.error || "Failed"}`);
          failCount++;
          continue;
        }

        addToast(`✅ ${file.name} sent (${i + 1}/${totalFiles})`, "success");
        successCount++;

        // Delay between sends to avoid rate limiting
        if (i < selectedFiles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      } catch (err) {
        addToast(`❌ ${file.name}: ${err.message}`);
        failCount++;
      }
    }

    setSendResult(
      `✅ Queue complete: ${successCount} sent, ${failCount} failed`,
    );
    setTextValue("");
    setSelectedFiles([]);
    setSendProgress("");
    setIsSending(false);
  };

  const handleLogout = () => {
    document.cookie =
      "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setIsLoggedIn(false);
    router.push("/");
  };

  // ═══ LOGIN SCREEN ═══
  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            maxWidth: "448px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🔐</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "700" }}>
              Admin Login
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--secondary)",
                marginTop: "4px",
              }}
            >
              Authorized access only
            </p>
          </div>
          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter username"
                required
                disabled={loginLoading}
                autoComplete="username"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
                required
                disabled={loginLoading}
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div
                className="badge-error"
                style={{ textAlign: "center", display: "block" }}
              >
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              {loginLoading ? "🔄 Logging in..." : "🔑 Login"}
            </button>
          </form>
          <div style={{ textAlign: "center" }}>
            <button onClick={() => router.push("/")} className="link-subtle">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ ADMIN DASHBOARD ═══
  return (
    <div
      className="animate-fade-in"
      style={{
        maxWidth: "672px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Toasts */}
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
              backgroundColor: toast.type === "success" ? "#dcfce7" : "#fee2e2",
              color: toast.type === "success" ? "#166534" : "#991b1b",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700" }}>
            🛡️ Admin Dashboard
          </h1>
          <p
            style={{
              color: "var(--secondary)",
              fontSize: "14px",
              marginTop: "4px",
            }}
          >
            Send directly to Telegram • No data stored
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="btn-secondary"
          style={{ padding: "8px 16px", fontSize: "14px" }}
        >
          🚪 Logout
        </button>
      </div>

      <div className="result-box warning-box">
        <p style={{ fontSize: "14px", color: "var(--primary)" }}>
          ℹ️ <strong>Admin Mode:</strong> Content sent directly to Telegram.
          Nothing stored. Max 4.5MB per file. Up to 10 files (sent in queue).
        </p>
      </div>

      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <button
            onClick={() => setInputType("text")}
            className={`type-button ${inputType === "text" ? "active" : "inactive"}`}
            style={{ padding: "12px 24px", fontSize: "16px" }}
          >
            📝 Text
          </button>
          <button
            onClick={() => setInputType("file")}
            className={`type-button ${inputType === "file" ? "active" : "inactive"}`}
            style={{ padding: "12px 24px", fontSize: "16px" }}
          >
            📎 Files
          </button>
        </div>

        {inputType === "text" && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "8px",
              }}
            >
              Message to send:
            </label>
            <textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Type or paste your text here..."
              className="input-field"
              style={{ height: "192px", resize: "none" }}
              disabled={isSending}
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--secondary)",
                textAlign: "right",
                marginTop: "4px",
              }}
            >
              {textValue.length.toLocaleString()} characters
            </p>
          </div>
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
                  if (e.target.files) handleNewFiles(e.target.files);
                  e.target.value = "";
                }}
                disabled={isSending}
              />
              <div>
                <p style={{ fontSize: "3rem", marginBottom: "8px" }}>
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
                  Max 10 files • 4.5MB each • All file types • Smart queue
                </p>
              </div>
            </div>

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
                        style={{ fontSize: "12px", color: "var(--secondary)" }}
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
                  {selectedFiles.length}/{MAX_FILES} files
                </p>
              </div>
            )}
          </div>
        )}

        {sendError && (
          <div className="result-box error-box" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--error)" }}>{sendError}</p>
          </div>
        )}
        {sendResult && (
          <div className="result-box success" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--success)", fontWeight: "500" }}>
              {sendResult}
            </p>
          </div>
        )}
        {sendProgress && (
          <div style={{ textAlign: "center" }}>
            <p
              className="animate-pulse-slow"
              style={{ color: "var(--primary)" }}
            >
              {sendProgress}
            </p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={isSending}
          className="btn-primary"
          style={{ width: "100%", fontSize: "1.125rem", padding: "16px" }}
        >
          {isSending ? "🔄 Sending to Telegram..." : "📤 Send to Telegram"}
        </button>
      </div>

      <div style={{ textAlign: "center" }}>
        <button onClick={() => router.push("/")} className="link-subtle">
          ← Back to Public Clipboard
        </button>
      </div>
    </div>
  );
}
