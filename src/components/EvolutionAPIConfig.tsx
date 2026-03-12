import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  QrCode,
  RefreshCw,
  Trash2,
  Smartphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  IntegrationService,
  EvolutionCreateInstanceRequest,
  EvolutionStatusResponse,
} from "@/services/integrationService";
import { useCompany } from "@/contexts/CompanyContext";

interface EvolutionAPIConfigProps {
  onConnected?: () => void;
}

export default function EvolutionAPIConfig({
  onConnected,
}: EvolutionAPIConfigProps) {
  const { currentCompany } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isRefreshingQR, setIsRefreshingQR] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("disconnected");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmKeyword, setDeleteConfirmKeyword] = useState("");
  const CONFIRM_DELETE_KEYWORD = "DELETAR";
  const pollingRef = useRef(false);
  const connectedToastShownRef = useRef(false);
  const statusRef = useRef<string>("disconnected"); // Ref para status atualizado

  // Gerar instance_name padrão baseado no nome da empresa
  useEffect(() => {
    if (currentCompany && !instanceName) {
      const defaultName = currentCompany.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);
      setInstanceName(
        defaultName || `company-${currentCompany.id.substring(0, 8)}`
      );
    }
  }, [currentCompany, instanceName]);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const checkStatus = async () => {
    // ✅ Não fazer requisição se já estiver conectado (status === "open")
    // Isso evita requisições desnecessárias quando já está tudo configurado
    if (!currentCompany || pollingRef.current || statusRef.current === "open") {
      return;
    }

    try {
      pollingRef.current = true;
      const statusData = await IntegrationService.getEvolutionStatus(
        currentCompany.id
      );

      console.debug("evolution_api.status_updated", {
        status: statusData.status,
        previousStatus: status,
      });

      const previousStatus = status;
      setStatus(statusData.status);
      statusRef.current = statusData.status; // ✅ Atualizar ref também
      setPhoneNumber(statusData.phone_number);

      if (statusData.status === "open") {
        // Conectado! Parar polling completamente e limpar QR code
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        pollingRef.current = false;
        setQrCode(null); // Limpar QR code quando conectar

        // Mostrar toast apenas quando mudar de outro estado para "open"
        if (previousStatus !== "open" && !connectedToastShownRef.current) {
          connectedToastShownRef.current = true;
          toast({
            title: "WhatsApp conectado!",
            description: `Número: ${statusData.phone_number || "N/A"}`,
          });
          onConnected?.();
        }
      } else if (
        statusData.status === "close" ||
        statusData.status === "connecting"
      ) {
        // Ainda não conectado - continuar mostrando QR code e fazendo polling
        // Não limpar o QR code aqui, apenas continuar o polling
        // Se o QR code sumiu, tentar buscar novamente
        if (!qrCode && statusData.status === "connecting") {
          handleRefreshQRCode();
        }
      } else {
        // Status desconhecido ou 'disconnected' - continuar polling mas manter QR code se existir
        // Não limpar o QR code, pode ser que o usuário ainda esteja escaneando
      }
    } catch (error: any) {
      // Se não encontrar instância ou erro 400, parar polling e definir como desconectado
      const errorMsg = error?.detail || error?.message || "";
      if (
        errorMsg.includes("não encontrada") ||
        errorMsg.includes("not found") ||
        error?.status === 400
      ) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        setStatus("disconnected");
        statusRef.current = "disconnected"; // ✅ Atualizar ref
        connectedToastShownRef.current = false; // Reset para permitir toast novamente
        pollingRef.current = false;
        // Não mostrar toast de erro se for apenas "não encontrada" (instância ainda não criada)
        if (
          !errorMsg.includes("não encontrada") &&
          !errorMsg.includes("not found")
        ) {
          console.warn("evolution_api.status_check_warn", { message: errorMsg });
        }
      } else {
        // Outros erros - logar mas não parar polling
        console.error("evolution_api.status_check_error", { error: error instanceof Error ? error.message : String(error) });
      }
    } finally {
      pollingRef.current = false;
    }
  };

  const startStatusPolling = () => {
    // ✅ Não iniciar polling se já estiver conectado
    if (statusRef.current === "open") {
      return;
    }

    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(() => {
      // ✅ Verificar novamente antes de cada chamada usando ref (valor sempre atualizado)
      if (statusRef.current === "open") {
        clearInterval(interval);
        setPollingInterval(null);
        return;
      }
      checkStatus();
    }, 5000); // Polling a cada 5 segundos (reduzido de 3s para menos requisições)

    setPollingInterval(interval);
  };

  const handleCreateInstance = async () => {
    if (!currentCompany) {
      toast({
        title: "Selecione uma empresa",
        description: "Escolha um tenant no topo antes de configurar.",
        variant: "destructive",
      });
      return;
    }

    if (!instanceName.trim()) {
      toast({
        title: "Nome da instância obrigatório",
        description: "Informe um nome único para a instância.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const payload: EvolutionCreateInstanceRequest = {
        company_id: currentCompany.id,
        instance_name: instanceName.trim(),
      };

      const result = await IntegrationService.createEvolutionInstance(payload);
      setQrCode(result.qr_code);
      setStatus(result.status);
      statusRef.current = result.status; // ✅ Atualizar ref
      connectedToastShownRef.current = false; // Reset para permitir toast quando conectar

      toast({
        title: "Instância criada!",
        description: "Escaneie o QR Code com seu WhatsApp.",
      });

      // Iniciar polling de status
      startStatusPolling();
    } catch (error: any) {
      const errorMessage =
        error?.detail || error?.message || "Erro ao criar instância";
      toast({
        title: "Erro ao criar instância",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshQRCode = async () => {
    if (!currentCompany) return;

    setIsRefreshingQR(true);
    try {
      const result = await IntegrationService.getEvolutionQRCode(
        currentCompany.id
      );
      setQrCode(result.qr_code);
      toast({
        title: "QR Code atualizado",
        description: "Escaneie o novo QR Code.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao obter QR Code",
        description: error?.detail || error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingQR(false);
    }
  };

  const handleDeleteInstance = () => {
    if (!currentCompany) return;
    setDeleteConfirmKeyword("");
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteInstance = async () => {
    if (!currentCompany || deleteConfirmKeyword !== CONFIRM_DELETE_KEYWORD) return;

    setIsDeleteDialogOpen(false);
    setDeleteConfirmKeyword("");
    setIsDeleting(true);
    try {
      await IntegrationService.deleteEvolutionInstance(currentCompany.id);
      setQrCode(null);
      setStatus("disconnected");
      statusRef.current = "disconnected"; // ✅ Atualizar ref
      setPhoneNumber(null);
      connectedToastShownRef.current = false; // Reset para permitir toast novamente
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      toast({
        title: "Instância deletada",
        description: "A instância foi removida com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao deletar instância",
        description: error?.detail || error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Verificar status inicial ao montar
  // Verificar status inicial quando empresa muda, mas apenas uma vez
  useEffect(() => {
    if (currentCompany && statusRef.current !== "open" && !pollingInterval) {
      // Verificar status inicial apenas uma vez quando empresa muda
      // Não iniciar polling automático aqui - apenas verificar status atual
      // O polling será iniciado apenas quando criar uma instância
      checkStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]); // Usar apenas company.id para evitar re-execuções desnecessárias

  const getStatusBadge = () => {
    switch (status) {
      case "open":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Configurado
          </Badge>
        );
      case "connecting":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/50 bg-amber-500/10 text-amber-200"
          >
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Conectando...
          </Badge>
        );
      case "close":
        return (
          <Badge
            variant="outline"
            className="border-red-500/50 bg-red-500/10 text-red-200"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-gray-500/50 bg-gray-500/10 text-gray-200"
          >
            Não configurado
          </Badge>
        );
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header Section - Responsivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
            Evolution API
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            WhatsApp Business API alternativa (sem dependência da Meta)
          </p>
        </div>
        <div className="flex-shrink-0 self-start sm:self-center">
          {getStatusBadge()}
        </div>
      </div>

      {/* Instance Info Card - Responsivo */}
      {status !== "disconnected" && instanceName && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500">
                Instância
              </p>
              <p className="text-sm sm:text-base font-medium text-white break-words sm:break-all">
                {instanceName}
              </p>
            </div>
            <div className="flex-shrink-0 self-start sm:self-center">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      )}

      {/* Formulário de criação - Responsivo */}
      {status === "disconnected" && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5 lg:p-6 space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="instance_name"
              className="text-xs sm:text-sm font-medium text-gray-300"
            >
              Nome da Instância *
            </Label>
            <Input
              id="instance_name"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="empresa-xyz"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 sm:px-4 sm:py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-[#EC4899]/60 focus:ring-1 focus:ring-[#EC4899]/20 focus:outline-none transition-all"
              disabled={creating}
            />
            <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
              Nome único para identificar esta instância (ex: empresa-xyz)
            </p>
          </div>

          <Button
            onClick={handleCreateInstance}
            disabled={creating || !instanceName.trim() || !currentCompany}
            className="w-full gap-2 h-10 sm:h-11 rounded-lg font-medium text-[11px] sm:text-xs bg-[#EC4899] hover:bg-[#EC4899]/90 text-white border border-[#EC4899] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_-4px_rgba(236,72,153,0.6)] hover:shadow-[0_8px_20px_-8px_rgba(236,72,153,0.8)] flex items-center justify-center px-3 sm:px-4 overflow-hidden"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span className="hidden min-[375px]:inline truncate">Criando instância...</span>
                <span className="min-[375px]:hidden truncate">Criando...</span>
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 flex-shrink-0" />
                <span className="hidden md:inline truncate">
                  Criar Instância e Gerar QR Code
                </span>
                <span className="hidden sm:inline md:hidden truncate">
                  Criar Instância e QR Code
                </span>
                <span className="sm:hidden truncate">Criar Instância</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* QR Code Section - Responsivo */}
      {qrCode && status !== "open" && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5 lg:p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm sm:text-base font-semibold text-white">
              Escaneie o QR Code
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshQRCode}
              disabled={isRefreshingQR}
              className="gap-2 h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
            >
              <RefreshCw
                className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isRefreshingQR ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>

          <div className="flex justify-center p-3 sm:p-4 bg-white rounded-lg mx-auto w-full max-w-xs sm:max-w-sm">
            <img
              src={
                qrCode.startsWith("data:image")
                  ? qrCode
                  : `data:image/png;base64,${qrCode}`
              }
              alt="QR Code WhatsApp"
              className="w-full h-auto max-w-[240px] sm:max-w-[280px] md:max-w-[320px]"
              style={{ imageRendering: "crisp-edges" }}
            />
          </div>

          <div className="text-center space-y-1 px-2">
            <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
              Abra o WhatsApp no celular → Menu → Dispositivos conectados →
            </p>
            <p className="text-[11px] sm:text-xs text-gray-400">
              Conectar um dispositivo
            </p>
          </div>
        </div>
      )}

      {/* Status Conectado - Responsivo */}
      {status === "open" && (
        <Alert className="rounded-xl border-emerald-500/50 bg-emerald-500/10 p-4 sm:p-5">
          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0" />
          <AlertTitle className="text-sm sm:text-base font-semibold text-emerald-200 mt-0">
            WhatsApp Conectado
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-1.5 text-xs sm:text-sm text-emerald-300/90">
            {phoneNumber && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-400">Número:</span>
                <span className="font-medium break-all">{phoneNumber}</span>
              </div>
            )}
            <p className="text-emerald-200/80 leading-relaxed">
              A instância está pronta para receber e enviar mensagens.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons - Responsivo */}
      {status !== "disconnected" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 w-full min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
            className="flex-1 gap-2 h-10 sm:h-11 rounded-lg text-sm sm:text-base min-w-0"
          >
            <RefreshCw
              className={`h-4 w-4 flex-shrink-0 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline truncate">Verificar Status</span>
            <span className="sm:hidden truncate">Status</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteInstance}
            disabled={isDeleting}
            className="flex-1 gap-2 h-10 sm:h-11 rounded-lg text-red-200 border-red-500/50 hover:bg-red-500/10 hover:text-red-100 transition-colors text-sm sm:text-base min-w-0"
          >
            <Trash2 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Deletar Instância</span>
            <span className="sm:hidden truncate">Deletar</span>
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog - padrão igual ao modal de deletar documentos */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmKeyword("");
          setIsDeleteDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Trash2 className="h-5 w-5" />
              Deletar Instância
            </DialogTitle>
            <p className="text-sm text-gray-400">
              Esta ação não pode ser desfeita. A instância será permanentemente removida.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações da instância */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-[#EC4899]" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{instanceName || "Instância selecionada"}</p>
                  <p className="text-xs text-gray-400">Evolution API · WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Alerta */}
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-3">
              <p className="text-xs text-rose-300">
                <strong>⚠️ Atenção:</strong> Você precisará criar uma nova instância e escanear o QR Code novamente para reconectar o WhatsApp.
              </p>
            </div>

            {/* Campo de confirmação */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500">
                Digite <span className="text-rose-400 font-bold">{CONFIRM_DELETE_KEYWORD}</span> para confirmar
              </label>
              <Input
                value={deleteConfirmKeyword}
                onChange={(e) => setDeleteConfirmKeyword(e.target.value.toUpperCase())}
                placeholder={CONFIRM_DELETE_KEYWORD}
                className="border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500 font-mono tracking-widest text-center"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-sm text-gray-200 hover:bg-white/[0.12]"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-rose-500 text-sm text-white font-semibold hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={confirmDeleteInstance}
              disabled={isDeleting || deleteConfirmKeyword !== CONFIRM_DELETE_KEYWORD}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Confirmar deleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
