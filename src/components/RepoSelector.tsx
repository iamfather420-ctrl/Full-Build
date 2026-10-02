import React, { useState, useEffect } from "react";
import { Search, Github, Key, User, Star, GitBranch, ArrowRight, CheckCircle, HelpCircle, AlertCircle, Upload, Folder, FileCode } from "lucide-react";
import JSZip from "jszip";
import { GitHubRepo } from "../types";
import { SovereignInputResolver } from "../lib/sovereignInputResolver";

interface RepoSelectorProps {
  onReposSelected: (selectedRepos: GitHubRepo[], token: string | null) => void;
  isLoading: boolean;
}

const getApiUrl = (endpoint: string): string => {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    window.location.origin.startsWith('http') &&
    !window.location.protocol.startsWith('file') &&
    !window.location.protocol.startsWith('app')
  ) {
    return cleanPath;
  }
  const fallbackBackend = import.meta.env.VITE_APP_URL || 'https://ais-pre-3y3j3yyljcsyipwgof5h4q-630645465623.us-west2.run.app';
  return `${fallbackBackend.replace(/\/$/, '')}${cleanPath}`;
};

export default function RepoSelector({ onReposSelected, isLoading }: RepoSelectorProps) {
  const [authMode, setAuthMode] = useState<"username" | "token" | "oauth" | "upload">("username");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [oauthToken, setOauthToken] = useState<string | null>(null);

  // Read client-id config state to show info
  const [oauthConfigured, setOauthConfigured] = useState(false);

  useEffect(() => {
    // Check if OAuth token was saved in localStorage previously
    const savedToken = localStorage.getItem("github_tether_token");
    if (savedToken) {
      setOauthToken(savedToken);
      fetchReposWithToken(savedToken);
    }
  }, []);

  // Listen for OAuth messages from the popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Validate origin is from this preview or localhost
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }

      if (event.data?.type === "OAUTH_AUTH_SUCCESS" && event.data?.token) {
        const tokenReceived = event.data.token;
        setOauthToken(tokenReceived);
        localStorage.setItem("github_tether_token", tokenReceived);
        setAuthMode("oauth");
        fetchReposWithToken(tokenReceived);
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  const handleOAuthConnect = async () => {
    setError(null);
    try {
      const response = await fetch(getApiUrl("/api/auth/url"));
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!response.ok) {
        let errorMessage = "OAuth is not configured on this server instance yet.";
        if (isJson) {
          const errData = await response.json().catch(() => ({}));
          errorMessage = errData.error || errorMessage;
        } else {
          const errText = await response.text().catch(() => "");
          if (errText.trim().startsWith("<") || errText.includes("<!doctype")) {
            errorMessage = `OAuth endpoint returned server error (${response.status}).`;
          } else {
            errorMessage = `Server error (${response.status}): ${errText.substring(0, 150)}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (!isJson) {
        const errText = await response.text().catch(() => "");
        if (errText.trim().startsWith("<") || errText.includes("<!doctype")) {
          throw new Error("Server returned non-JSON response for OAuth config. Please retry.");
        }
        throw new Error(`Invalid non-JSON response from server (${response.status}).`);
      }

      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        "github_oauth_popup",
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        alert("Please enable popups to authenticate with GitHub.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize GitHub OAuth flow.");
    }
  };

  const fetchReposWithToken = async (authToken: string) => {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl("/api/github/repos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: authToken }),
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!response.ok) {
        let errorMessage = "Failed to retrieve authenticated repositories.";
        if (isJson) {
          const errData = await response.json().catch(() => ({}));
          errorMessage = errData.error || errorMessage;
        } else {
          const errText = await response.text().catch(() => "");
          if (errText.trim().startsWith("<") || errText.includes("<!doctype")) {
            errorMessage = `Server error (${response.status}) when contacting GitHub API proxy.`;
          } else {
            errorMessage = `Server error (${response.status}): ${errText.substring(0, 150)}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (!isJson) {
        const errText = await response.text().catch(() => "");
        if (errText.trim().startsWith("<") || errText.includes("<!doctype")) {
          throw new Error("Unable to reach GitHub proxy (server returned unexpected payload). Please retry.");
        }
        throw new Error(`Invalid non-JSON response from server (${response.status}).`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setRepos(data.map(r => ({ ...r, selected: false })));
      } else {
        throw new Error("Invalid response format received from GitHub API.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while connecting to GitHub.");
      setOauthToken(null);
      localStorage.removeItem("github_tether_token");
    } finally {
      setFetching(false);
    }
  };

  const handleFetchPublic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setFetching(true);
    setError(null);
    setRepos([]);

    try {
      const response = await fetch(getApiUrl("/api/github/repos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!response.ok) {
        let errorMessage = `Failed to fetch public repos for user: ${username}`;
        if (isJson) {
          const errData = await response.json().catch(() => ({}));
          errorMessage = errData.error || errorMessage;
        } else {
          const errText = await response.text().catch(() => "");
          if (errText.trim().startsWith("<") || errText.includes("<!doctype")) {
            errorMessage = `Server error (${response.status}) when fetching public repositories.`;
          } else {
            errorMessage = `Server error (${response.status}): ${errText.substring(0, 150)}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (!isJson) {
        const errText = await response.text().catch(() => "");
        if (errText.trim().startsWith("<") || errText.includes("<!doctype")) {
          throw new Error("Server returned non-JSON payload instead of repository data. Please retry.");
        }
        throw new Error(`Invalid non-JSON response from server (${response.status}).`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        if (data.length === 0) {
          setError(`No public repositories found for user '${username}'.`);
        } else {
          setRepos(data.map(r => ({ ...r, selected: false })));
        }
      } else {
        throw new Error("Invalid response format received from server.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve public repositories.");
    } finally {
      setFetching(false);
    }
  };

  const handleFetchWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setFetching(true);
    setError(null);
    setRepos([]);

    try {
      await fetchReposWithToken(token.trim());
      setOauthToken(token.trim());
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Token.");
    } finally {
      setFetching(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const IGNORED_PATHS = ["node_modules/", ".git/", "dist/", ".turbo/", "__MACOSX/", ".DS_Store", "coverage/", ".next/", "build/"];
  const BINARY_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".pdf", ".zip", ".exe", ".dex", ".jar", ".so", ".dylib", ".dll", ".ttf", ".woff", ".woff2", ".eot", ".mp3", ".mp4", ".wav", ".ogg", ".tar", ".gz", ".7z", ".iso", ".class", ".pyc", ".db"];

  const isIgnoredPath = (path: string): boolean => {
    return IGNORED_PATHS.some(ignored => path.includes(ignored));
  };

  const isBinaryFile = (filename: string): boolean => {
    const extIdx = filename.lastIndexOf(".");
    if (extIdx === -1) return false;
    const ext = filename.substring(extIdx).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
  };

  const normalizeZipPaths = (files: { path: string; content: string; size: number }[]): { path: string; content: string; size: number }[] => {
    if (files.length === 0) return files;
    
    // Find common prefix if all files start with folderName/
    const firstPath = files[0].path;
    const firstSlashIdx = firstPath.indexOf("/");
    if (firstSlashIdx > 0) {
      const commonPrefix = firstPath.substring(0, firstSlashIdx + 1);
      const allHavePrefix = files.every(f => f.path.startsWith(commonPrefix));
      if (allHavePrefix) {
        return files.map(f => ({
          ...f,
          path: f.path.substring(commonPrefix.length),
        }));
      }
    }
    return files;
  };

  const processUploadedFiles = async (filesList: FileList) => {
    setFetching(true);
    setError(null);
    try {
      const newRepos: GitHubRepo[] = [];

      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const isZip = file.name.endsWith(".zip");

        if (isZip) {
          const zip = await JSZip.loadAsync(file);
          const unpackedFiles: { path: string; content: string; size: number }[] = [];
          const promises: Promise<void>[] = [];

          zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir && !isIgnoredPath(relativePath)) {
              if (isBinaryFile(relativePath)) {
                unpackedFiles.push({
                  path: relativePath,
                  content: `[Binary file asset: ${relativePath}]`,
                  size: (zipEntry as any)._data?.uncompressedSize || 0,
                });
              } else {
                const p = zipEntry.async("string").then((content) => {
                  unpackedFiles.push({
                    path: relativePath,
                    content,
                    size: content.length,
                  });
                });
                promises.push(p);
              }
            }
          });

          await Promise.all(promises);
          const normalizedFiles = normalizeZipPaths(unpackedFiles);

          // Resolve local input using sovereign module directly
          await SovereignInputResolver.resolveLocalInputs({
            accountName: "local_archive",
            uploadedFiles: normalizedFiles.map(f => ({ name: f.path, content: f.content }))
          });

          const repoName = file.name.replace(/\.[^/.]+$/, "");
          newRepos.push({
            id: Math.floor(Math.random() * 10000000),
            name: repoName,
            full_name: `local/${repoName}`,
            owner: {
              login: "local_archive",
            },
            description: `ZIP Archive: ${file.name} (${(file.size / 1024).toFixed(1)} KB, ${normalizedFiles.length} files included)`,
            html_url: "#",
            stargazers_count: 0,
            language: "Local ZIP",
            selected: true,
            isUploadedZip: true,
            uploadedFiles: normalizedFiles,
          });
        } else {
          // Other format: Single file upload (JSON, JS, TS, etc.)
          const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || "");
            reader.onerror = (e) => reject(new Error("File reading failed"));
            reader.readAsText(file);
          });

          const repoName = file.name.replace(/\.[^/.]+$/, "");
          newRepos.push({
            id: Math.floor(Math.random() * 10000000),
            name: repoName,
            full_name: `local/${repoName}`,
            owner: {
              login: "local_file",
            },
            description: `Single file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
            html_url: "#",
            stargazers_count: 0,
            language: file.name.split(".").pop()?.toUpperCase() || "Plaintext",
            selected: true,
            isUploadedZip: true,
            uploadedFiles: [
              {
                path: file.name,
                content,
                size: content.length,
              }
            ],
          });
        }
      }

      if (newRepos.length > 0) {
        setRepos((prev) => [...newRepos, ...prev]);
        if (!oauthToken) {
          setOauthToken("local_archive");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process uploaded file specifications.");
    } finally {
      setFetching(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const toggleRepoSelection = (id: number) => {
    setRepos(prev =>
      prev.map(r => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleClearConnection = () => {
    setOauthToken(null);
    setRepos([]);
    setToken("");
    setUsername("");
    localStorage.removeItem("github_tether_token");
  };

  const selectedRepos = repos.filter(r => r.selected);

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.language && r.language.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="repo-selector">
      {/* Dynamic Authorization Gateway */}
      {!oauthToken ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Github className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display text-lg font-bold text-white m-0">
              Sovereign GitHub Tether Gateway
            </h2>
          </div>
          
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Establish a secure connection to your GitHub assets. Pull multiple repositories to merge them seamlessly into a single, optimized monorepo workspace structured by our logical grid.
          </p>

          {/* Authentication mode tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => { setAuthMode("username"); setError(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs transition-all ${
                authMode === "username"
                  ? "border-cyan-500 text-cyan-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
              id="auth-tab-username"
            >
              <User className="w-3.5 h-3.5" />
              Public Search
            </button>
            <button
              onClick={() => { setAuthMode("token"); setError(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs transition-all ${
                authMode === "token"
                  ? "border-cyan-500 text-cyan-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
              id="auth-tab-token"
            >
              <Key className="w-3.5 h-3.5" />
              Personal Access Token
            </button>
            <button
              onClick={() => { setAuthMode("oauth"); setError(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs transition-all ${
                authMode === "oauth"
                  ? "border-cyan-500 text-cyan-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
              id="auth-tab-oauth"
            >
              <Github className="w-3.5 h-3.5" />
              Direct GitHub OAuth
            </button>
            <button
              onClick={() => { setAuthMode("upload"); setError(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs transition-all ${
                authMode === "upload"
                  ? "border-cyan-500 text-cyan-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
              id="auth-tab-upload"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Source Archive
            </button>
          </div>

          {/* Username mode form */}
          {authMode === "username" && (
            <form onSubmit={handleFetchPublic} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Enter GitHub username (e.g. facebook, vercel)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 font-sans outline-none transition-all"
                    id="username-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={fetching || !username.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
                  id="fetch-username-btn"
                >
                  {fetching ? "Syncing..." : "Scan Repositories"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-lg text-xs text-slate-400">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> Perfect for exploration! You do not need any credentials. Type any GitHub user or organization to download or pack their public repositories instantly.
                </span>
              </div>
            </form>
          )}

          {/* Token mode form */}
          {authMode === "token" && (
            <form onSubmit={handleFetchWithToken} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Paste GitHub Personal Access Token (PAT)"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 font-mono outline-none transition-all"
                    id="token-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={fetching || !token.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
                  id="fetch-token-btn"
                >
                  {fetching ? "Connecting..." : "Tether Account"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                To create a PAT: Go to GitHub &gt; Settings &gt; Developer settings &gt; Personal access tokens &gt; Tokens (classic), generate one with <code className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-cyan-400">repo</code> scopes.
              </p>
            </form>
          )}

          {/* OAuth mode form */}
          {authMode === "oauth" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg text-center space-y-4">
                <div className="w-12 h-12 bg-cyan-950/40 border border-cyan-800/40 rounded-full flex items-center justify-center mx-auto text-cyan-400">
                  <Github className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="font-display font-bold text-sm text-white">Connect GitHub via OAuth</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Instantly authenticate via GitHub's official consent screen. Requires <code className="bg-slate-900 px-1 text-cyan-400">GITHUB_CLIENT_ID</code> and <code className="bg-slate-900 px-1 text-cyan-400">GITHUB_CLIENT_SECRET</code> to be added in Settings &gt; Secrets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOAuthConnect}
                  disabled={fetching}
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold rounded-lg transition-all shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
                  id="oauth-connect-btn"
                >
                  <Github className="w-4 h-4" />
                  {fetching ? "Connecting Secure Core..." : "Authenticate with GitHub"}
                </button>
              </div>

              {/* Developer Configuration Instructions */}
              <details className="group border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                <summary className="flex items-center justify-between px-4 py-3 text-xs font-mono font-bold text-slate-400 hover:text-slate-300 cursor-pointer select-none">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    How to configure GitHub OAuth in AI Studio
                  </span>
                  <span className="text-xs transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="px-4 pb-4 border-t border-slate-850 pt-3 text-xs text-slate-400 space-y-3 font-sans">
                  <p>To enable OAuth, create a GitHub OAuth application on your GitHub Developer settings dashboard:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to: <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="text-cyan-400 underline">https://github.com/settings/developers</a></li>
                    <li>Click <strong>Register a new application</strong>.</li>
                    <li>Set Homepage URL to: <code className="bg-slate-900 px-1 text-cyan-400">https://ais-pre-3y3j3yyljcsyipwgof5h4q-630645465623.us-west2.run.app</code></li>
                    <li>Set Authorization callback URL to: <code className="bg-slate-900 px-1 text-cyan-400">https://ais-pre-3y3j3yyljcsyipwgof5h4q-630645465623.us-west2.run.app/auth/callback</code></li>
                    <li>Generate client secret and add both <code className="bg-slate-900 px-1 text-cyan-400">GITHUB_CLIENT_ID</code> and <code className="bg-slate-900 px-1 text-cyan-400">GITHUB_CLIENT_SECRET</code> to AI Studio Secrets panel.</li>
                  </ol>
                </div>
              </details>
            </div>
          )}

          {/* Upload mode form */}
          {authMode === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer relative min-h-[220px] ${
                  isDragging
                    ? "border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/5"
                    : "border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 hover:border-slate-700"
                }`}
                onClick={() => document.getElementById("file-upload-input")?.click()}
                id="upload-dropzone"
              >
                <input
                  type="file"
                  id="file-upload-input"
                  className="hidden"
                  multiple
                  accept=".zip,.json,.js,.ts,.tsx,.txt,.md,.yaml,.yml"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processUploadedFiles(e.target.files);
                    }
                  }}
                />
                
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isDragging ? "bg-cyan-950 text-cyan-400" : "bg-slate-950 text-slate-400 border border-slate-850"
                }`}>
                  <Upload className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">
                    Drag and drop your source archives or single config files
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Supports <strong className="text-cyan-400 font-mono">.zip</strong> folders containing whole codebases, package configurations (<strong className="text-cyan-400 font-mono">package.json</strong>), single JS/TS files, JSON scripts, and other text formats.
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-400">
                    ZIP Archives
                  </span>
                  <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-400">
                    Single Files
                  </span>
                  <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-400">
                    Config JSON
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-lg text-xs text-slate-400">
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Sovereign Ingest:</strong> Uploaded source code is parsed securely in-memory in your local sandbox browser tab. No code gets stored on third-party tracking databases. You can combine multiple ZIPs and other file formats instantly into one optimized APK.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3.5 bg-rose-950/30 border border-rose-800/40 rounded-lg text-xs text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="space-y-1">
                <span className="font-semibold block">Tether Interruption</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Repositories Selected Dashboard
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Tether Connected</span>
              </div>
              <h2 className="font-display text-lg font-bold text-white mt-1 mb-0">
                Select Repositories to Consolidate
              </h2>
            </div>
            
            <button
              onClick={handleClearConnection}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-[11px] rounded-lg transition-all"
              id="clear-tether-btn"
            >
              Change Account / Log Out
            </button>
          </div>

          {fetching ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-xs font-mono">Syncing file structures from secure repository channels...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Repository list toolbar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter repository grid by name, description, or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 font-sans outline-none transition-all"
                  id="repo-filter-input"
                />
              </div>

              {/* Optional Local File Ingest during Selection */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("blend-upload-input")?.click()}
                className={`border border-dashed rounded-xl p-3 text-center transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer text-xs ${
                  isDragging
                    ? "border-cyan-500 bg-cyan-950/20 text-cyan-400 font-bold"
                    : "border-slate-800 bg-slate-950/20 hover:bg-slate-950/50 text-slate-400 hover:text-slate-300"
                }`}
                id="blend-upload-dropzone"
              >
                <input
                  type="file"
                  id="blend-upload-input"
                  className="hidden"
                  multiple
                  accept=".zip,.json,.js,.ts,.tsx,.txt,.md,.yaml,.yml"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processUploadedFiles(e.target.files);
                    }
                  }}
                />
                <Upload className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>
                  <strong>Blend extra files:</strong> Click or drag another <code className="bg-slate-950 px-1 font-mono text-cyan-400 text-[10px]">.zip</code> or configuration file to merge with this compilation.
                </span>
              </div>

              {/* Repos Grid */}
              {filteredRepos.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                  No repositories match your active filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => toggleRepoSelection(repo.id)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                        repo.selected
                          ? "bg-cyan-950/30 border-cyan-500/80 shadow-md shadow-cyan-500/5"
                          : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700"
                      }`}
                      id={`repo-card-${repo.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display font-bold text-sm text-slate-200 truncate">
                            {repo.name}
                          </h3>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              repo.selected
                                ? "bg-cyan-500 border-cyan-400 text-slate-950"
                                : "border-slate-700"
                            }`}
                          >
                            {repo.selected && (
                              <svg className="w-2.5 h-2.5 fill-current font-bold" viewBox="0 0 20 20">
                                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                              </svg>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 h-8">
                          {repo.description || "No description provided."}
                        </p>
                      </div>

                      <div className="flex items-center gap-3.5 mt-3 pt-3 border-t border-slate-800/40 text-[10px] font-mono text-slate-500">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-500/80" />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-500/80 fill-amber-500/10" />
                          {repo.stargazers_count || 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <GitBranch className="w-3 h-3 text-slate-500" />
                          {repo.default_branch || "main"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400 font-mono">
                  Selected Repositories:{" "}
                  <span className="text-cyan-400 font-bold">{selectedRepos.length}</span>
                </div>
                
                <button
                  type="button"
                  disabled={selectedRepos.length === 0 || isLoading}
                  onClick={() => onReposSelected(selectedRepos, oauthToken)}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-white text-sm font-semibold rounded-lg transition-all shadow-lg disabled:shadow-none hover:shadow-cyan-500/15 flex items-center justify-center gap-2"
                  id="consolidate-btn"
                >
                  {isLoading ? "Synthesizing Core..." : "Consolidate to Unified Monorepo"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
