import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { API_ENDPOINTS, getAuthHeaders, API_BASE_URL, resolveWorkspaceIdForApi } from "../config/api";
import { useWorkspace } from "../contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  Check,
  X,
  Clock,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  filename: string;
  chunks: number;
  embeddings: number;
  words: number;
  status: "processing" | "completed" | "failed";
  uploaded_at: string;
  processed_at?: string;
}

export default function Documents() {
  useRequireAuth();
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal de confirmação de deleção
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmKeyword, setDeleteConfirmKeyword] = useState("");
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const CONFIRM_DELETE_KEYWORD = t("documents.confirmDeleteKeyword");
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  
  // XML Preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

  // Buscar documentos ao carregar
  useEffect(() => {
    fetchDocuments();
  }, [currentWorkspace]);

  const fetchDocuments = async () => {
    try {
      // Buscar dados do usuário via /auth/me
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });

      if (!meRes.ok) return;

      const userData = await meRes.json();
      const companyId = resolveWorkspaceIdForApi(currentWorkspace, userData);

      if (!companyId) return;

      const res = await fetch(`${API_BASE_URL}/documents/list/${companyId}`, {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("documents.fetch_error", { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const previewFile = async (file: File) => {
    const fileExt = file.name.toLowerCase().split('.').pop();
    const supportedFormats = ['xml', 'pdf', 'txt', 'md', 'html', 'htm'];
    
    if (!supportedFormats.includes(fileExt || '')) {
      setError(t("documents.errors.previewAvailable", { formats: supportedFormats.join(", ") }));
      return;
    }
    
    setPreviewLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/documents/preview`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || t("documents.errors.previewError"));
      }
      
      const data = await res.json();
      setPreviewData(data);
      setPreviewModalOpen(true);
    } catch (err: any) {
      console.error("documents.preview_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || t("documents.errors.previewError"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleChunkExpansion = (chunkIndex: number) => {
    setExpandedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkIndex)) {
        newSet.delete(chunkIndex);
      } else {
        newSet.add(chunkIndex);
      }
      return newSet;
    });
  };

  const viewIndexedDocument = async (documentId: string) => {
    setPreviewLoading(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });
      
      if (!meRes.ok) {
        throw new Error(t("documents.errors.sessionExpired"));
      }
      
      const userData = await meRes.json();
      const companyId = resolveWorkspaceIdForApi(currentWorkspace, userData);
      
      const res = await fetch(
        `${API_BASE_URL}/documents/${documentId}/view?company_id=${companyId}`,
        { headers }
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || t("documents.errors.viewDocument"));
      }
      
      const data = await res.json();
      setPreviewData(data);
      setPreviewModalOpen(true);
    } catch (err: any) {
      console.error("documents.view_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || t("documents.errors.viewDocument"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      // Sempre buscar dados atualizados do /auth/me
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });

      if (!meRes.ok) {
        throw new Error(t("documents.errors.sessionExpired"));
      }

      const userData = await meRes.json();
      const companyId = resolveWorkspaceIdForApi(currentWorkspace, userData);
      const userId = userData.user_id;

      if (!companyId || !userId) {
        throw new Error(
          t("documents.errors.noCompanySupport")
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("company_id", companyId);
      formData.append("created_by", userId);
      formData.append("title", file.name);

      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!res.ok) {
        const contentType = res.headers.get("Content-Type") || "";
        let message = t("documents.errors.uploadError");
        if (contentType.includes("application/json")) {
          try {
            const errorData = await res.json();
            const detail = errorData.detail ?? errorData.message ?? errorData.error;
            message = Array.isArray(detail)
              ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(". ")
              : typeof detail === "string"
                ? detail
                : message;
          } catch {
            message = await res.text().then((t) => t || message).catch(() => message);
          }
        }
        throw new Error(message);
      }

      const data = await res.json();
      setSuccess(`✅ ${data.message}`);

      // Atualizar lista
      await fetchDocuments();
    } catch (err: any) {
      console.error("documents.upload_error", { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await uploadFile(files[0]);

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setError(err.message || t("documents.errors.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Só remove isDragging se realmente saiu do container (não é filho)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validExtensions = ['.pdf', '.docx', '.txt', '.md', '.xml', '.html', '.htm'];
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      setError(t("documents.errors.unsupportedFormat", { extensions: validExtensions.join(", ") }));
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await uploadFile(file);
    } catch (err: any) {
      setError(err.message || t("documents.errors.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDeleteModal = (doc: Document) => {
    setDeletingDocument(doc);
    setDeleteConfirmKeyword("");
    setDeleteModalOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setDeleteConfirmKeyword("");
    setDeletingDocument(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDocument || deleteConfirmKeyword !== CONFIRM_DELETE_KEYWORD) {
      return;
    }

    setIsDeleting(true);

    try {
      setError(null);
      setSuccess(null);

      // Buscar dados do usuário via /auth/me
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });

      if (!meRes.ok) {
        setError(t("documents.errors.sessionExpired"));
        return;
      }

      const userData = await meRes.json();
      const companyId = resolveWorkspaceIdForApi(currentWorkspace, userData);

      if (!companyId) {
        setError(t("documents.errors.noCompany"));
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/documents/${deletingDocument.id}?company_id=${companyId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || t("documents.errors.deleteSuccess"));
        handleCancelDelete();
        // Atualizar lista após um pequeno delay para garantir que a deleção foi processada
        setTimeout(() => {
          fetchDocuments();
        }, 500);
      } else {
        // ✅ Tratar erros específicos
        const errorData = await res
          .json()
          .catch(() => ({ detail: t("documents.errors.unknown") }));
        const errorMessage =
          errorData.detail ||
          errorData.message ||
          `Erro ${res.status}: ${res.statusText}`;
        setError(errorMessage);
        console.error("documents.delete_error", { detail: errorMessage });
      }
    } catch (err: any) {
      console.error("documents.delete_error", { error: err instanceof Error ? err.message : String(err) });
      setError(
        err.message || t("documents.errors.deleteError")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      // Buscar dados do usuário via /auth/me
      const headers = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers });

      if (!meRes.ok) {
        setError(t("documents.errors.sessionExpired"));
        return;
      }

      const userData = await meRes.json();
      const companyId = resolveWorkspaceIdForApi(currentWorkspace, userData);

      if (!companyId) {
        setError(t("documents.errors.noCompany"));
        return;
      }

      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE_URL}/documents/download/${documentId}?company_id=${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(t("documents.errors.downloadError"));
      }

      // Download do arquivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(t("documents.errors.downloadDone"));
    } catch (err: any) {
      console.error("documents.download_error", { error: err instanceof Error ? err.message : String(err) });
      setError(err.message || t("documents.errors.downloadError"));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 " + t("documents.sizes.0");
    const k = 1024;
    const sizes = t("documents.sizes", { returnObjects: true }) as string[];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Check className="w-3 h-3" />
            {t("documents.statusProcessed")}
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EC4899]/10 border border-[#EC4899]/20 text-[#EC4899] text-xs font-medium">
            <Clock className="w-3 h-3 animate-spin" />
            {t("documents.statusProcessing")}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            <X className="w-3 h-3" />
            {t("documents.statusFailed")}
          </span>
        );
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="glass-panel rounded-xl p-4 border border-green-500/30 bg-green-500/10">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <p className="text-white/80">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-panel rounded-xl p-4 border border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-white/80">{error}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-6 shadow-[0_30px_80px_-60px_rgba(236,72,153,0.45)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">{t("documents.title")}</h1>
              <p className="mt-2 text-sm text-gray-400">
                {t("documents.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xml,.pdf,.txt,.md,.html,.htm';
                  input.onchange = (e: any) => {
                    const file = e.target?.files?.[0];
                    if (file) previewFile(file);
                  };
                  input.click();
                }}
                disabled={previewLoading}
                className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                title={t("documents.previewTitle")}
              >
                {previewLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {t("documents.preview")}
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-3 rounded-2xl bg-[#EC4899] border border-[#EC4899] text-white font-medium hover:bg-[#EC4899]/90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {t("documents.upload")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.xml,.html,.htm"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-[#EC4899]" />
              <h3 className="text-sm font-medium text-gray-400">
                {t("documents.totalDocuments")}
              </h3>
            </div>
            <p className="text-3xl font-bold text-white">{documents.length}</p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-medium text-gray-400">{t("documents.processed")}</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {documents.filter((d) => d.status === "completed").length}
            </p>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-[#EC4899]" />
              <h3 className="text-sm font-medium text-gray-400">
                {t("documents.totalChunks")}
              </h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {documents.reduce((sum, d) => sum + (d.chunks || 0), 0)}
            </p>
          </div>
        </div>

        {/* Lista de Documentos - com Drag & Drop */}
        <div 
          className={`glass-card rounded-3xl p-8 transition-all ${
            isDragging 
              ? 'border-2 border-[#EC4899] bg-[#EC4899]/5 shadow-[0_0_30px_rgba(236,72,153,0.3)]' 
              : ''
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{t("documents.files")}</h2>
            {isDragging && (
              <span className="text-sm text-[#EC4899] font-medium animate-pulse">
                {t("documents.dropHere")}
              </span>
            )}
          </div>

          {documents.length === 0 ? (
            <div 
              className={`text-center py-12 rounded-2xl border-2 border-dashed transition-all ${
                isDragging 
                  ? 'border-[#EC4899] bg-[#EC4899]/10' 
                  : 'border-white/10'
              }`}
            >
              <Upload className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                isDragging ? 'text-[#EC4899]' : 'text-white/20'
              }`} />
              <p className="text-white/40 text-lg mb-2">
                {isDragging ? t("documents.dropHere") : t("documents.noDocumentsYet")}
              </p>
              <p className="text-white/30 text-sm">
                {isDragging 
                  ? t("documents.dropToUpload")
                  : t("documents.dropOrClick")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {isDragging && (
                <div className="mb-4 p-6 rounded-2xl border-2 border-dashed border-[#EC4899] bg-[#EC4899]/10 text-center">
                  <Upload className="w-12 h-12 text-[#EC4899] mx-auto mb-3 animate-bounce" />
                  <p className="text-[#EC4899] font-medium">
                    {t("documents.dropFileToUpload")}
                  </p>
                  <p className="text-sm text-white/40 mt-1">
                    PDF, TXT, MD, XML ou HTML
                  </p>
                </div>
              )}
              
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="w-5 h-5 text-[#EC4899]" />
                      <div className="flex-1">
                        <p className="font-medium text-white">{doc.title}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{doc.words} {t("documents.words")}</span>
                          <span>{doc.chunks} {t("documents.chunks")}</span>
                          <span>{doc.embeddings} {t("documents.embeddings")}</span>
                          <span>
                            {new Date(doc.uploaded_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(doc.status)}
                      <button
                        onClick={() => viewIndexedDocument(doc.id)}
                        className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 hover:text-blue-400 transition-all"
                        title={t("documents.viewIndexed")}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc.id, doc.filename)}
                        className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 hover:text-[#EC4899] transition-all"
                        title={t("documents.download")}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(doc)}
                        className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 hover:text-rose-400 transition-all"
                        title={t("documents.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de deleção */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelDelete();
          }
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Trash2 className="h-5 w-5" />
              {t("documents.deleteDocument")}
            </DialogTitle>
            <p className="text-sm text-gray-400">
              {t("documents.deleteConfirmMessage")}
            </p>
          </DialogHeader>

          {deletingDocument && (
            <div className="space-y-4">
              {/* Informações do documento */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#EC4899]" />
                  <div className="flex-1">
                    <p className="font-medium text-white">{deletingDocument.title}</p>
                    <p className="text-xs text-gray-400">{deletingDocument.filename}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{deletingDocument.chunks} {t("documents.chunks")}</span>
                  <span>{deletingDocument.embeddings} {t("documents.embeddings")}</span>
                  <span>{deletingDocument.words} {t("documents.words")}</span>
                </div>
              </div>

              {/* Alerta */}
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
                <p className="text-xs text-rose-300">
                  <strong>⚠️</strong> {t("documents.deleteWarning")}
                </p>
              </div>

              {/* Campo de confirmação */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t("documents.typeToConfirm")} <span className="text-rose-400 font-bold">{CONFIRM_DELETE_KEYWORD}</span> {t("documents.toConfirm")}
                </label>
                <Input
                  value={deleteConfirmKeyword}
                  onChange={(event) => setDeleteConfirmKeyword(event.target.value.toUpperCase())}
                  placeholder={CONFIRM_DELETE_KEYWORD}
                  className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500 font-mono tracking-widest text-center"
                  autoFocus
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              {t("documents.cancel")}
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-rose-500 text-sm text-white font-semibold hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirmDelete}
              disabled={isDeleting || deleteConfirmKeyword !== CONFIRM_DELETE_KEYWORD}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("documents.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Preview/Visualização */}
      <Dialog open={previewModalOpen} onOpenChange={(open) => {
        setPreviewModalOpen(open);
        if (!open) {
          setExpandedChunks(new Set()); // Resetar chunks expandidos ao fechar
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0a0a0a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#EC4899]" />
              {previewData?.document ? t("documents.indexedDocument") : t("documents.documentPreview")}
              {previewData?.filename && (
                <span className="text-sm text-gray-400 font-normal ml-2">
                  ({previewData.filename})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {previewData && (
              <div className="space-y-6 mt-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">{t("documents.totalWords")}</p>
                    <p className="text-2xl font-bold text-white">
                      {previewData.stats?.total_words?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">{t("documents.totalChunksLabel")}</p>
                    <p className="text-2xl font-bold text-white">
                      {previewData.stats?.total_chunks || 0}
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">{t("documents.avgChunkSize")}</p>
                    <p className="text-2xl font-bold text-white">
                      {previewData.stats?.avg_chunk_size || 0}
                    </p>
                  </div>
                  {previewData.stats?.has_structured_data && (
                    <div className="glass-card rounded-xl p-4 border border-green-500/30">
                      <p className="text-xs text-gray-400 mb-1">
                        {previewData.total_properties_in_xml > previewData.stats?.structured_properties 
                          ? t("documents.propertiesInXml")
                          : t("documents.propertiesParsed")}
                      </p>
                      <p className="text-2xl font-bold text-green-400">
                        {previewData.stats?.structured_properties || 0}
                        {previewData.total_properties_in_xml > previewData.stats?.structured_properties && (
                          <span className="text-sm text-gray-400 ml-2">
                            {t("documents.of")} {previewData.total_properties_in_xml}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Success/Message */}
                {previewData.message && (
                  <div className={`rounded-xl p-4 border ${
                    previewData.total_properties_in_xml > previewData.stats?.structured_properties
                      ? 'border-blue-500/30 bg-blue-500/10'
                      : 'border-green-500/30 bg-green-500/10'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Check className={`w-5 h-5 ${
                        previewData.total_properties_in_xml > previewData.stats?.structured_properties
                          ? 'text-blue-400'
                          : 'text-green-400'
                      }`} />
                      <p className="text-white/80">{previewData.message}</p>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="space-y-4">
                  {/* Dados Estruturados (se houver) */}
                  {previewData.formatted_structured_text && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        📊 {t("documents.structuredDataParsed")}
                      </h3>
                      <div className="glass-card rounded-xl p-4 max-h-96 overflow-y-auto border border-green-500/20">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {previewData.formatted_structured_text}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Chunks */}
                  {previewData.chunks && previewData.chunks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        📄 {t("documents.chunkLabel")}s ({previewData.chunks.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {previewData.chunks.map((chunk: any, idx: number) => {
                          const isExpanded = expandedChunks.has(chunk.index);
                          const hasMore = chunk.text && chunk.text.length > chunk.preview.length;
                          
                          return (
                            <div key={idx} className="glass-card rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono text-gray-500">
                                  Chunk #{chunk.index}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({chunk.word_count} {t("documents.words")})
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 whitespace-pre-wrap">
                                {isExpanded ? chunk.text : chunk.preview}
                              </p>
                              {hasMore && (
                                <button
                                  onClick={() => toggleChunkExpansion(chunk.index)}
                                  className="mt-3 text-xs text-[#EC4899] hover:text-[#F472B6] transition-colors flex items-center gap-1"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>{t("documents.seeLess")}</span>
                                      <span className="text-[10px]">▲</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>{t("documents.seeMore")}</span>
                                      <span className="text-[10px]">▼</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Texto Completo Extraído */}
                  {previewData.extracted_text && (
                    <details className="space-y-2">
                      <summary className="text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors">
                        📝 {t("documents.fullTextExtracted")}
                      </summary>
                      <div className="glass-card rounded-xl p-4 max-h-96 overflow-y-auto mt-2">
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                          {previewData.extracted_text}
                        </pre>
                      </div>
                    </details>
                  )}

                  {/* JSON Estruturado (se houver) */}
                  {previewData.structured_data && (
                    <details className="space-y-2">
                      <summary className="text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors">
                        🔧 {t("documents.structuredDataJson")}
                      </summary>
                      <div className="glass-card rounded-xl p-4 max-h-64 overflow-y-auto mt-2">
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
                          {JSON.stringify(previewData.structured_data, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 border-t border-white/5 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={() => setPreviewModalOpen(false)}
            >
              {t("documents.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
