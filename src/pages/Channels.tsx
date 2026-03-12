import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArisaraSwitch } from "@/components/ui/nyoka-switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquareMore,
  Phone,
  Share2,
  MonitorSmartphone,
  MapPin,
  Laptop,
  Clock,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Copy,
  Info,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  IntegrationService,
  WabaSignupSessionResponse,
  TwilioSignupRequest,
  TwilioSignupResponse,
  TwilioWhatsAppNumberRequest,
  TwilioWhatsAppNumberResponse,
  TwilioAvailableNumberResponse,
  TwilioWhatsAppProfileRequest,
  TwilioWhatsAppProfileResponse,
} from "@/services/integrationService";
import EvolutionAPIConfig from "@/components/EvolutionAPIConfig";

interface ChannelConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status: "connected" | "pending" | "draft";
  lastSync?: string;
}

const channels: ChannelConfig[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: MessageSquareMore,
    description:
      "Atendimentos automatizados via API oficial do WhatsApp Business.",
    status: "connected",
    lastSync: "Hoje • 08:12",
  },
  {
    id: "sms",
    name: "SMS + Voice",
    icon: Phone,
    description:
      "Templates transacionais, respostas rápidas e fallback para chamadas de voz.",
    status: "pending",
  },
  {
    id: "webchat",
    name: "Webchat",
    icon: MonitorSmartphone,
    description:
      "Widget pronto para sites, landing pages e portais com suporte a temas.",
    status: "connected",
    lastSync: "Ontem • 18:47",
  },
  {
    id: "instagram",
    name: "Instagram DM",
    icon: Share2,
    description:
      "Inbox unificada para mensagens diretas e mentions em Stories.",
    status: "draft",
  },
];

const statusBadge = (status: ChannelConfig["status"]) => {
  switch (status) {
    case "connected":
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
    case "pending":
      return "border-amber-500/50 bg-amber-500/10 text-amber-200";
    case "draft":
      return "border-gray-500/40 bg-gray-500/10 text-gray-200";
    default:
      return "border-white/10 bg-white/5 text-white";
  }
};

const regionPresets = [
  { id: "americas", label: "Américas", countries: 9 },
  { id: "emea", label: "EMEA", countries: 6 },
  { id: "apac", label: "APAC", countries: 4 },
];

export default function ChannelsPage() {
  const { t } = useTranslation();
  const [selectedRegion, setSelectedRegion] = useState<string>("americas");
  const [autoFallback, setAutoFallback] = useState(true);
  const [isStartingSignup, setIsStartingSignup] = useState(false);
  const [wabaSession, setWabaSession] =
    useState<WabaSignupSessionResponse | null>(null);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  // WhatsApp Provider states
  const [whatsappProvider, setWhatsappProvider] = useState<
    "meta" | "twilio" | "evolution"
  >("evolution");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [isSavingTwilioCredentials, setIsSavingTwilioCredentials] =
    useState(false);
  const [twilioCredentialsSaved, setTwilioCredentialsSaved] = useState(false);
  const [whatsappNumbers, setWhatsappNumbers] = useState<
    TwilioWhatsAppNumberResponse[]
  >([]);
  const [availableNumbers, setAvailableNumbers] = useState<
    TwilioAvailableNumberResponse[]
  >([]);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);
  const [isLoadingAvailableNumbers, setIsLoadingAvailableNumbers] =
    useState(false);
  const [newNumber, setNewNumber] = useState({
    whatsapp_number: "",
    display_name: "",
    description: "",
  });
  const [isAddingNumber, setIsAddingNumber] = useState(false);
  const [showAddNumberForm, setShowAddNumberForm] = useState(false);
  const [expandedSection, setExpandedSection] = useState<
    "credentials" | "available" | "registered" | null
  >("credentials");

  // WhatsApp Profile states
  const [selectedNumberForProfile, setSelectedNumberForProfile] = useState<
    string | null
  >(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: "",
    description: "",
    category: "",
    website: "",
    address: "",
    email: "",
    profile_image_url: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();

  const activeChannels = useMemo(
    () => channels.filter((channel) => channel.status === "connected").length,
    []
  );

  // Ouvir mensagens do popup quando callback é bem-sucedido
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verificar origem para segurança
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "WABA_SIGNUP_SUCCESS") {
        const { data } = event.data;

        // Fechar popup se ainda estiver aberto
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close();
          setPopupWindow(null);
        }

        // Resetar sessão WABA para permitir novo signup
        setWabaSession(null);

        // Mostrar toast de sucesso
        toast({
          title: t("channels.toasts.wabaConnected"),
          description: data.message || t("channels.toasts.integrationSuccess"),
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [popupWindow, toast]);

  // Verificar periodicamente se popup foi fechado manualmente ou se URL mudou
  useEffect(() => {
    if (!popupWindow) return;

    const checkInterval = setInterval(() => {
      if (popupWindow.closed) {
        setPopupWindow(null);
        clearInterval(checkInterval);
      } else {
        // Verificar se popup está na página de callback de sucesso
        try {
          const popupUrl = popupWindow.location.href;
          if (
            popupUrl.includes("/integrations/whatsapp/callback") ||
            popupUrl.includes("/integrations/waba/callback")
          ) {
            // Se popup está no callback e ainda aberto após 2 segundos, tentar fechar
            setTimeout(() => {
              if (popupWindow && !popupWindow.closed) {
                try {
                  popupWindow.close();
                  setPopupWindow(null);
                } catch (err) {
                  // Popup pode estar em domínio diferente (CORS)
                  console.warn("channels.popup_cors_unavailable");
                }
              }
            }, 2000);
          }
        } catch (err) {
          // Ignorar erros de CORS (popup pode estar em domínio diferente)
        }
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [popupWindow]);

  const openSignupPopup = (url: string) => {
    // Dimensões do popup (centrado na tela)
    const width = 800;
    const height = 900;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Features do popup
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "toolbar=no",
      "menubar=no",
      "scrollbars=yes",
      "resizable=yes",
      "status=no",
    ].join(",");

    return window.open(url, "wabaSignup", features);
  };

  const handleStartWhatsAppSignup = async () => {
    if (!currentCompany) {
      toast({
        title: t("channels.toasts.selectCompany"),
        description: t("channels.toasts.selectCompanyDescription"),
      });
      return;
    }

    setIsStartingSignup(true);
    try {
      const session = await IntegrationService.createWabaSignupSession(
        currentCompany.id
      );
      setWabaSession(session);

      const popup = openSignupPopup(session.signup_url);
      if (!popup) {
        toast({
          title: t("channels.toasts.popupBlocked"),
          description: t("channels.toasts.popupBlockedDescription"),
          variant: "destructive",
        });
      } else {
        setPopupWindow(popup);
        popup.focus();
      }

      toast({
        title: t("channels.toasts.embeddedSignupStarted"),
        description: `Conecte ${currentCompany.name} seguindo o fluxo da Meta.`,
      });
    } catch (error: any) {
      const detail =
        error?.detail || error?.message || t("channels.toasts.signupFail");
      const isConfigError =
        detail.includes("não configurado") || detail.includes("WABA_");
      toast({
        title: isConfigError ? t("channels.toasts.configRequired") : t("channels.toasts.startFailed"),
        description: isConfigError
          ? `${detail} Entre em contato com o administrador para configurar as credenciais da Meta.`
          : detail,
        variant: isConfigError ? "destructive" : "default",
      });
    } finally {
      setIsStartingSignup(false);
    }
  };

  const handleCopySignupUrl = async () => {
    if (!wabaSession?.signup_url) return;
    try {
      await navigator.clipboard.writeText(wabaSession.signup_url);
      toast({
        title: t("channels.toasts.linkCopied"),
        description: t("channels.toasts.pasteInBrowser"),
      });
    } catch (error) {
      toast({
        title: t("channels.toasts.copyFailed"),
        description: wabaSession.signup_url,
      });
    }
  };

  const handleCopyVerifyToken = async () => {
    if (!wabaSession?.verify_token) return;
    try {
      await navigator.clipboard.writeText(wabaSession.verify_token);
      toast({
        title: t("channels.toasts.verifyTokenCopied"),
        description: t("channels.toasts.pasteVerifyToken"),
      });
    } catch (error) {
      toast({
        title: t("channels.toasts.copyFailed"),
        description: t("channels.toasts.copyTokenFailed"),
        variant: "destructive",
      });
    }
  };

  const handleOpenSignupUrlAgain = () => {
    if (!wabaSession?.signup_url) return;

    // Fechar popup anterior se existir
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }

    const popup = openSignupPopup(wabaSession.signup_url);
    if (!popup) {
      toast({
        title: t("channels.toasts.popupBlocked"),
        description: t("channels.toasts.popupBlockedCopy"),
        variant: "destructive",
      });
    } else {
      setPopupWindow(popup);
      popup.focus();
    }
  };

  // Twilio handlers
  const handleSaveTwilioCredentials = async () => {
    if (!currentCompany) {
      toast({
        title: t("channels.toasts.selectCompany"),
        description: t("channels.toasts.selectCompanyTwilio"),
      });
      return;
    }

    if (!twilioAccountSid.trim() || !twilioAuthToken.trim()) {
      toast({
        title: t("channels.toasts.requiredFields"),
        description: t("channels.toasts.fillSidToken"),
        variant: "destructive",
      });
      return;
    }

    setIsSavingTwilioCredentials(true);
    try {
      const payload: TwilioSignupRequest = {
        company_id: currentCompany.id,
        account_sid: twilioAccountSid.trim(),
        auth_token: twilioAuthToken.trim(),
      };

      const response = await IntegrationService.createTwilioSignup(payload);
      setTwilioCredentialsSaved(true);
      setTwilioAccountSid(""); // Limpar campos sensíveis
      setTwilioAuthToken("");

      toast({
        title: t("channels.toasts.twilioSaved"),
        description: response.message,
      });

      // Carregar números WhatsApp cadastrados e disponíveis
      loadWhatsAppNumbers();
      loadAvailableNumbers();
    } catch (error: any) {
      const detail =
        error?.detail ||
        error?.message ||
        t("channels.toasts.saveCredentialsFailed");
      toast({
        title: t("channels.toasts.saveCredentialsError"),
        description: detail,
        variant: "destructive",
      });
    } finally {
      setIsSavingTwilioCredentials(false);
    }
  };

  const loadAvailableNumbers = async () => {
    if (!currentCompany) return;

    setIsLoadingAvailableNumbers(true);
    try {
      const numbers = await IntegrationService.getTwilioAvailableNumbers(
        currentCompany.id
      );
      setAvailableNumbers(numbers);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar números disponíveis",
        description:
          error?.detail ||
          error?.message ||
          t("channels.toasts.fetchNumbersDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoadingAvailableNumbers(false);
    }
  };

  const loadWhatsAppNumbers = async () => {
    if (!currentCompany) return;

    setIsLoadingNumbers(true);
    try {
      const numbers = await IntegrationService.listTwilioWhatsAppNumbers(
        currentCompany.id
      );
      setWhatsappNumbers(numbers);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar números",
        description:
          error?.detail ||
          error?.message ||
          t("channels.toasts.loadNumbersDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  const handleAddWhatsAppNumber = async (
    whatsappNumber?: string,
    displayName?: string
  ) => {
    if (!currentCompany) {
      toast({
        title: t("channels.toasts.selectCompany"),
        description: t("channels.toasts.selectCompanyShort"),
      });
      return;
    }

    // Se número foi passado (da lista de disponíveis), usar ele
    const numberToAdd = whatsappNumber || newNumber.whatsapp_number.trim();
    const nameToAdd = displayName || newNumber.display_name.trim();

    if (!numberToAdd) {
      toast({
        title: t("channels.toasts.numberRequired"),
        description: t("channels.toasts.numberFormat"),
        variant: "destructive",
      });
      return;
    }

    // Validar formato
    const numberPattern = /^whatsapp:\+\d{10,15}$/;
    if (!numberPattern.test(numberToAdd)) {
      toast({
        title: t("channels.toasts.invalidFormat"),
        description: t("channels.toasts.useTwilioFormat"),
        variant: "destructive",
      });
      return;
    }

    setIsAddingNumber(true);
    try {
      const payload: TwilioWhatsAppNumberRequest = {
        company_id: currentCompany.id,
        whatsapp_number: numberToAdd,
        display_name: nameToAdd || null,
        description: null,
      };

      await IntegrationService.addTwilioWhatsAppNumber(payload);

      toast({
        title: t("channels.toasts.numberAdded"),
        description: t("channels.toasts.numberAddedDescription"),
      });

      // Limpar formulário e recarregar listas
      setNewNumber({ whatsapp_number: "", display_name: "", description: "" });
      setShowAddNumberForm(false);
      loadWhatsAppNumbers();
      loadAvailableNumbers(); // Recarregar disponíveis para atualizar status
    } catch (error: any) {
      const detail =
        error?.detail ||
        error?.message ||
        t("channels.toasts.addNumberFailed");
      toast({
        title: t("channels.toasts.addNumberError"),
        description: detail,
        variant: "destructive",
      });
    } finally {
      setIsAddingNumber(false);
    }
  };

  const handleRemoveWhatsAppNumber = async (numberId: string) => {
    if (!currentCompany) return;

    if (!confirm(t("channels.toasts.confirmRemoveNumber"))) {
      return;
    }

    try {
      await IntegrationService.removeTwilioWhatsAppNumber(
        numberId,
        currentCompany.id
      );

      toast({
        title: "Número removido",
        description: "Número WhatsApp removido com sucesso.",
      });

      loadWhatsAppNumbers();
    } catch (error: any) {
      const detail =
        error?.detail || error?.message || "Não foi possível remover o número.";
      toast({
        title: "Erro ao remover número",
        description: detail,
        variant: "destructive",
      });
    }
  };

  // WhatsApp Profile handlers
  const handleOpenProfileConfig = async (whatsappNumber: string) => {
    setSelectedNumberForProfile(whatsappNumber);
    setIsProfileModalOpen(true);
    setIsLoadingProfile(true);

    try {
      const profile = await IntegrationService.getTwilioWhatsAppProfile(
        whatsappNumber,
        currentCompany?.id
      );
      setProfileData({
        display_name: profile.display_name || "",
        description: profile.description || "",
        category: profile.category || "",
        website: profile.website || "",
        address: profile.address || "",
        email: profile.email || "",
        profile_image_url: profile.profile_image_url || "",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description:
          error?.detail ||
          error?.message ||
          "Não foi possível carregar o perfil do WhatsApp Business.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedNumberForProfile(null);
    setProfileData({
      display_name: "",
      description: "",
      category: "",
      website: "",
      address: "",
      email: "",
      profile_image_url: "",
    });
  };

  const handleSaveProfile = async () => {
    if (!currentCompany || !selectedNumberForProfile) return;

    setIsSavingProfile(true);
    try {
      const payload: TwilioWhatsAppProfileRequest = {
        company_id: currentCompany.id,
        whatsapp_number: selectedNumberForProfile,
        display_name: profileData.display_name || null,
        description: profileData.description || null,
        category: profileData.category || null,
        website: profileData.website || null,
        address: profileData.address || null,
        email: profileData.email || null,
        profile_image_url: profileData.profile_image_url || null,
      };

      const response = await IntegrationService.updateTwilioWhatsAppProfile(
        payload
      );

      toast({
        title: "Perfil atualizado!",
        description: response.message,
      });

      handleCloseProfileModal();
    } catch (error: any) {
      const detail =
        error?.detail ||
        error?.message ||
        "Não foi possível atualizar o perfil.";
      toast({
        title: "Erro ao atualizar perfil",
        description: detail,
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Carregar números ao montar componente se tiver empresa
  useEffect(() => {
    if (currentCompany && whatsappProvider === "twilio") {
      loadWhatsAppNumbers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id, whatsappProvider]);

  return (
    <>
      <Layout>
        <div className="space-y-8">
          <header className="rounded-3xl border border-white/10 bg-white/[0.05] px-8 py-6 backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  Omnichannel
                </p>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  {t("channels.title")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  {t("channels.subtitle")}
                </p>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-gray-300">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    {t("channels.activeChannels")}
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    {activeChannels}
                  </p>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-200">
                    SLA 99.5% / 30 dias
                  </span>
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {channels.map((channel) => (
              <Card
                key={channel.id}
                className="glass-card group flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6 transition hover:-translate-y-1 hover:border-[#EC4899]/40 hover:bg-[#EC4899]/5"
              >
                <CardContent className="flex flex-col gap-4 p-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <channel.icon className="h-5 w-5 text-[#EC4899]" />
                      <h2 className="text-sm font-semibold text-white">
                        {t(`channels.cards.${channel.id}.name`)}
                      </h2>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${statusBadge(channel.status)}`}
                    >
                      {channel.status === "connected"
                        ? t("channels.statusConnected")
                        : channel.status === "pending"
                        ? t("channels.statusPending")
                        : t("channels.statusDraft")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">{t(`channels.cards.${channel.id}.description`)}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{t("channels.autoPriority")}</span>
                    <ArisaraSwitch
                      defaultChecked={channel.status === "connected"}
                      disabled={channel.status !== "connected"}
                    />
                  </div>
                  {channel.id === "whatsapp" && (
                    <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                            {t("channels.whatsappIntegration")}
                          </p>
                          <p className="text-sm text-gray-300">
                            {t("channels.whatsappConfigure")}{" "}
                            <span className="font-medium text-white">
                              {currentCompany?.name ?? t("channels.yourCompany")}
                            </span>
                            .
                          </p>
                        </div>
                      </div>

                      <TooltipProvider>
                        <Tabs
                          value={whatsappProvider}
                          onValueChange={(v) =>
                            setWhatsappProvider(
                              v as "meta" | "twilio" | "evolution"
                            )
                          }
                          className="w-full"
                        >
                          <div className="w-full overflow-x-auto scrollbar-hide">
                            <TabsList className="inline-flex w-max justify-start gap-2 h-auto p-1.5 bg-black/40 border border-white/10 rounded-lg">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-shrink-0">
                                    <TabsTrigger
                                      value="twilio"
                                      disabled
                                      className="cursor-not-allowed opacity-50 whitespace-nowrap px-4 py-2.5 text-sm data-[state=active]:bg-black/60"
                                    >
                                      Twilio
                                    </TabsTrigger>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("channels.inDevelopment")}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-shrink-0">
                                    <TabsTrigger
                                      value="meta"
                                      disabled
                                      className="cursor-not-allowed opacity-50 whitespace-nowrap px-4 py-2.5 text-sm data-[state=active]:bg-black/60"
                                    >
                                      Meta (WABA)
                                    </TabsTrigger>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("channels.inDevelopment")}</p>
                                </TooltipContent>
                              </Tooltip>
                              <TabsTrigger
                                value="evolution"
                                className="flex-shrink-0 whitespace-nowrap px-4 py-2.5 text-sm data-[state=active]:bg-black/60"
                              >
                                Evolution API
                              </TabsTrigger>
                            </TabsList>
                          </div>

                          <TabsContent
                            value="twilio"
                            className="space-y-4 mt-4"
                          >
                            {/* Credenciais Twilio - Accordion */}
                            <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden transition-all duration-500">
                              <div
                                onClick={() =>
                                  setExpandedSection(
                                    expandedSection === "credentials"
                                      ? null
                                      : "credentials"
                                  )
                                }
                                className="w-full flex items-center justify-between p-5 hover:bg-black/40 transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setExpandedSection(
                                      expandedSection === "credentials"
                                        ? null
                                        : "credentials"
                                    );
                                  }
                                }}
                              >
                                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                                  Credenciais Twilio
                                </p>
                                {expandedSection === "credentials" ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <div
                                className={`overflow-hidden transition-all duration-500 ${
                                  expandedSection === "credentials"
                                    ? "max-h-[500px] opacity-100"
                                    : "max-h-0 opacity-0"
                                }`}
                              >
                                <div className="px-5 pb-5 space-y-4">
                                  <div>
                                    <label className="text-xs text-gray-400 mb-1 block">
                                      Account SID
                                    </label>
                                    <Input
                                      type="text"
                                      placeholder="AC..."
                                      value={twilioAccountSid}
                                      onChange={(e) =>
                                        setTwilioAccountSid(e.target.value)
                                      }
                                      disabled={
                                        isSavingTwilioCredentials ||
                                        twilioCredentialsSaved
                                      }
                                      className="bg-black/40 border-white/10"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400 mb-1 block">
                                      Auth Token
                                    </label>
                                    <div className="relative">
                                      <Input
                                        type={
                                          showAuthToken ? "text" : "password"
                                        }
                                        placeholder="Seu auth token..."
                                        value={twilioAuthToken}
                                        onChange={(e) =>
                                          setTwilioAuthToken(e.target.value)
                                        }
                                        disabled={
                                          isSavingTwilioCredentials ||
                                          twilioCredentialsSaved
                                        }
                                        className="bg-black/40 border-white/10 pr-10"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setShowAuthToken(!showAuthToken)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                                        disabled={
                                          isSavingTwilioCredentials ||
                                          twilioCredentialsSaved
                                        }
                                      >
                                        {showAuthToken ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={handleSaveTwilioCredentials}
                                    disabled={
                                      isSavingTwilioCredentials ||
                                      !currentCompany ||
                                      twilioCredentialsSaved
                                    }
                                    className="w-full gap-2"
                                  >
                                    {isSavingTwilioCredentials ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Validando credenciais...
                                      </>
                                    ) : twilioCredentialsSaved ? (
                                      <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Credenciais salvas
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck className="h-4 w-4" />
                                        Salvar credenciais
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Números Disponíveis (após salvar credenciais) - Accordion */}
                            {twilioCredentialsSaved && (
                              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden transition-all duration-500">
                                <div
                                  onClick={() =>
                                    setExpandedSection(
                                      expandedSection === "available"
                                        ? null
                                        : "available"
                                    )
                                  }
                                  className="w-full flex items-center justify-between p-5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setExpandedSection(
                                        expandedSection === "available"
                                          ? null
                                          : "available"
                                      );
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">
                                      Números Disponíveis na Conta Twilio
                                    </p>
                                    {availableNumbers.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-xs"
                                      >
                                        {availableNumbers.length}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        loadAvailableNumbers();
                                      }}
                                      disabled={isLoadingAvailableNumbers}
                                      className="gap-2 text-emerald-400 hover:text-emerald-300 h-6 px-2"
                                    >
                                      {isLoadingAvailableNumbers ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                      {availableNumbers.length === 0 &&
                                        !isLoadingAvailableNumbers &&
                                        "Buscar"}
                                    </Button>
                                    {expandedSection === "available" ? (
                                      <ChevronUp className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-emerald-400" />
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={`overflow-hidden transition-all duration-500 ${
                                    expandedSection === "available"
                                      ? "max-h-[600px] opacity-100"
                                      : "max-h-0 opacity-0"
                                  }`}
                                >
                                  <div className="px-5 pb-5 space-y-4">
                                    {isLoadingAvailableNumbers ? (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                      </div>
                                    ) : availableNumbers.length === 0 ? (
                                      <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                        <p className="text-sm text-gray-400 text-center">
                                          Nenhum número encontrado na conta
                                          Twilio.
                                        </p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={loadAvailableNumbers}
                                          disabled={isLoadingAvailableNumbers}
                                          className="gap-2"
                                        >
                                          {isLoadingAvailableNumbers ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <RefreshCw className="h-3 w-3" />
                                          )}
                                          Buscar números
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {availableNumbers.map((number) => {
                                          const isAlreadyAdded =
                                            whatsappNumbers.some(
                                              (n) =>
                                                n.whatsapp_number ===
                                                number.whatsapp_number
                                            );
                                          return (
                                            <div
                                              key={number.sid}
                                              className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 p-3"
                                            >
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-medium text-white">
                                                    {number.whatsapp_number}
                                                  </span>
                                                  {isAlreadyAdded && (
                                                    <Badge
                                                      variant="outline"
                                                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-xs"
                                                    >
                                                      Já adicionado
                                                    </Badge>
                                                  )}
                                                </div>
                                                {number.friendly_name && (
                                                  <p className="text-xs text-gray-400 mt-1">
                                                    {number.friendly_name}
                                                  </p>
                                                )}
                                              </div>
                                              <Button
                                                variant={
                                                  isAlreadyAdded
                                                    ? "outline"
                                                    : "default"
                                                }
                                                size="sm"
                                                onClick={() =>
                                                  handleAddWhatsAppNumber(
                                                    number.whatsapp_number,
                                                    number.friendly_name
                                                  )
                                                }
                                                disabled={
                                                  isAddingNumber ||
                                                  isAlreadyAdded
                                                }
                                                className="gap-2"
                                              >
                                                {isAddingNumber ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : isAlreadyAdded ? (
                                                  <CheckCircle2 className="h-3 w-3" />
                                                ) : (
                                                  <Plus className="h-3 w-3" />
                                                )}
                                                {isAlreadyAdded
                                                  ? "Adicionado"
                                                  : "Adicionar"}
                                              </Button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Números WhatsApp Cadastrados - Accordion */}
                            <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden transition-all duration-500">
                              <div
                                onClick={() =>
                                  setExpandedSection(
                                    expandedSection === "registered"
                                      ? null
                                      : "registered"
                                  )
                                }
                                className="w-full flex items-center justify-between p-5 hover:bg-black/40 transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setExpandedSection(
                                      expandedSection === "registered"
                                        ? null
                                        : "registered"
                                    );
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                                    Números WhatsApp Cadastrados
                                  </p>
                                  {whatsappNumbers.length > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="border-white/20 bg-white/5 text-gray-300 text-xs"
                                    >
                                      {whatsappNumbers.length}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowAddNumberForm(!showAddNumberForm);
                                    }}
                                    disabled={!twilioCredentialsSaved}
                                    className="gap-2 h-6 px-2"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Adicionar
                                  </Button>
                                  {expandedSection === "registered" ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              </div>
                              <div
                                className={`overflow-hidden transition-all duration-500 ${
                                  expandedSection === "registered"
                                    ? "max-h-[800px] opacity-100"
                                    : "max-h-0 opacity-0"
                                }`}
                              >
                                <div className="px-5 pb-5 space-y-4">
                                  {showAddNumberForm && (
                                    <div className="space-y-3 rounded-lg border border-white/10 bg-black/40 p-3">
                                      <div>
                                        <label className="text-xs text-gray-400 mb-1 block">
                                          Número WhatsApp
                                        </label>
                                        <Input
                                          type="text"
                                          placeholder="whatsapp:+5511999999999"
                                          value={newNumber.whatsapp_number}
                                          onChange={(e) =>
                                            setNewNumber({
                                              ...newNumber,
                                              whatsapp_number: e.target.value,
                                            })
                                          }
                                          className="bg-black/40 border-white/10 text-sm"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">
                                          Formato: whatsapp:+5511999999999
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-400 mb-1 block">
                                          Nome (opcional)
                                        </label>
                                        <Input
                                          type="text"
                                          placeholder="WhatsApp Principal"
                                          value={newNumber.display_name}
                                          onChange={(e) =>
                                            setNewNumber({
                                              ...newNumber,
                                              display_name: e.target.value,
                                            })
                                          }
                                          className="bg-black/40 border-white/10 text-sm"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() =>
                                            handleAddWhatsAppNumber()
                                          }
                                          disabled={isAddingNumber}
                                          size="sm"
                                          className="flex-1 gap-2"
                                        >
                                          {isAddingNumber ? (
                                            <>
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              Adicionando...
                                            </>
                                          ) : (
                                            <>
                                              <Plus className="h-3 w-3" />
                                              Adicionar
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setShowAddNumberForm(false);
                                            setNewNumber({
                                              whatsapp_number: "",
                                              display_name: "",
                                              description: "",
                                            });
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {isLoadingNumbers ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    </div>
                                  ) : whatsappNumbers.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center py-4">
                                      Nenhum número cadastrado. Adicione um
                                      número WhatsApp para começar.
                                    </p>
                                  ) : (
                                    <div className="space-y-3">
                                      {whatsappNumbers.map((number) => (
                                        <div
                                          key={number.id}
                                          className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 p-3"
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium text-white">
                                                {number.whatsapp_number}
                                              </span>
                                              {number.is_verified ? (
                                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                              ) : (
                                                <XCircle className="h-3 w-3 text-amber-400" />
                                              )}
                                            </div>
                                            {number.display_name && (
                                              <p className="text-xs text-gray-400 mt-1">
                                                {number.display_name}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                handleOpenProfileConfig(
                                                  number.whatsapp_number
                                                )
                                              }
                                              className="gap-2"
                                            >
                                              <ShieldCheck className="h-3 w-3" />
                                              Perfil
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleRemoveWhatsAppNumber(
                                                  number.id
                                                )
                                              }
                                              className="text-red-400 hover:text-red-300"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="meta" className="space-y-4 mt-4">
                            {!wabaSession ? (
                              <Button
                                onClick={handleStartWhatsAppSignup}
                                disabled={isStartingSignup}
                                className="w-full gap-2"
                                variant="outline"
                              >
                                <MessageSquareMore className="h-4 w-4" />
                                Iniciar Embedded Signup
                              </Button>
                            ) : (
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                  variant="secondary"
                                  className="flex-1 gap-2"
                                  onClick={handleOpenSignupUrlAgain}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Abrir fluxo
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1 gap-2"
                                  onClick={handleCopySignupUrl}
                                >
                                  <Copy className="h-4 w-4" />
                                  Copiar link
                                </Button>
                              </div>
                            )}

                            <div className="space-y-3">
                              <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                                Checklist rápido
                              </p>
                              <ul className="space-y-2 text-sm text-gray-300">
                                <li>
                                  1. Validar empresa e domínio antes do fluxo.
                                </li>
                                <li>
                                  2. Conectar página Facebook + número oficial.
                                </li>
                                <li>
                                  3. Autorizar a Arisara a gerenciar o WABA.
                                </li>
                                <li>
                                  4. Retornar à Arisara para provisionar tokens e
                                  webhook.
                                </li>
                              </ul>
                            </div>

                            {wabaSession && (
                              <Alert className="border-white/15 bg-white/5">
                                <Info className="h-4 w-4 text-emerald-400" />
                                <AlertTitle className="text-sm font-semibold text-white">
                                  Sessão ativa
                                </AlertTitle>
                                <AlertDescription className="mt-2 space-y-1.5 text-xs text-gray-300">
                                  <div>
                                    <span className="text-gray-400">
                                      State:
                                    </span>{" "}
                                    <span className="font-mono text-gray-200">
                                      {wabaSession.state}
                                    </span>
                                  </div>
                                  {wabaSession.verify_token && (
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1">
                                        <span className="text-gray-400">
                                          Verify token:
                                        </span>{" "}
                                        <span className="font-mono text-gray-200 break-all">
                                          {wabaSession.verify_token}
                                        </span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-white/10"
                                        onClick={handleCopyVerifyToken}
                                        title="Copiar verify token"
                                      >
                                        <Copy className="h-3 w-3 text-gray-400" />
                                      </Button>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-400">
                                      Expira em:
                                    </span>{" "}
                                    <span className="text-gray-200">
                                      {new Date(
                                        wabaSession.expires_at
                                      ).toLocaleString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                          </TabsContent>

                          <TabsContent
                            value="evolution"
                            className="mt-4 sm:mt-5 lg:mt-6 w-full"
                          >
                            <EvolutionAPIConfig />
                          </TabsContent>
                        </Tabs>
                      </TooltipProvider>
                    </div>
                  )}
                  {channel.lastSync && (
                    <p className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3 text-gray-500" />
                      Última sincronização: {channel.lastSync}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="glass-card rounded-3xl border border-white/10 bg-white/[0.04] px-7 py-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Experiência Omnichannel
                  </h3>
                    <p className="text-sm text-gray-400">
                    Regras de distribuição por contexto, horário e idioma. Tudo
                    alimentado com dados do CRM e da Arisara.
                    </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-blue-400/40 bg-blue-500/10 text-blue-200"
                >
                  {t('channels.betaRulesEngine')}
                </Badge>
              </div>

              <Tabs defaultValue="routing" className="space-y-5">
                <TabsList className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 text-xs uppercase tracking-[0.2em]">
                  <TabsTrigger value="routing">{t('channels.routing')}</TabsTrigger>
                  <TabsTrigger value="fallback">{t('channels.fallback')}</TabsTrigger>
                  <TabsTrigger value="proactivity">{t('channels.proactivity')}</TabsTrigger>
                </TabsList>

                <TabsContent value="routing" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('channels.identity')}
                      </p>
                      <h4 className="mt-2 text-sm font-semibold text-white">
                        {t('channels.contextByConfidence')}
                      </h4>
                      <p className="mt-2 text-xs text-gray-400">
                        {t('channels.routingConfidenceDesc')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {t('channels.languages')}
                      </p>
                      <h4 className="mt-2 text-sm font-semibold text-white">
                        {t('channels.redistributionByLanguage')}
                      </h4>
                      <p className="mt-2 text-xs text-gray-400">
                        {t('channels.redistributionByLanguageDesc')}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fallback" className="space-y-4">
                  <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-5">
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>{t('channels.autoFallbackLabel')}</span>
                      <ArisaraSwitch
                        checked={autoFallback}
                        onCheckedChange={setAutoFallback}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      {t('channels.autoFallbackDesc')}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2 text-xs text-gray-400">
                      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                          {t('channels.activeCriteria')}
                        </span>
                        <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
                          <li>Score de empatia &lt; 40</li>
                          <li>Usuário VIP / Executivo</li>
                          <li>Transação crítica (pagamentos)</li>
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                          {t('channels.whenDisabled')}
                        </span>
                        <p className="mt-2">
                          {t('channels.whenDisabledDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="proactivity" className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-4">
                      <h4 className="text-sm font-semibold text-white">
                        {t('channels.smartCampaigns')}
                      </h4>
                      <p className="mt-2 text-xs text-gray-400">
                        {t('channels.smartCampaignsDesc')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-4">
                      <h4 className="text-sm font-semibold text-white">
                        {t('channels.dynamicLocation')}
                      </h4>
                      <p className="mt-2 text-xs text-gray-400">
                        {t('channels.dynamicLocationDesc')}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="glass-card flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {t('channels.regionsAndTimes')}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {t('channels.regionsAndTimesDesc')}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/15 bg-white/5 text-[11px] text-gray-300"
                >
                  {t('channels.beta')}
                </Badge>
              </div>

              <ToggleGroup
                type="single"
                value={selectedRegion}
                onValueChange={(value) => value && setSelectedRegion(value)}
                className="grid grid-cols-3 gap-2"
              >
                {regionPresets.map((region) => (
                  <ToggleGroupItem
                    key={region.id}
                    value={region.id}
                    className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-xs font-medium text-white data-[state=on]:border-[#EC4899]/60 data-[state=on]:bg-[#EC4899]/20"
                  >
                    <span>{t(`channels.regions.${region.id}`)}</span>
                    <span className="text-[10px] text-gray-400">
                      {region.countries} {t('channels.markets')}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t('channels.scaleByLocation')}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#EC4899]" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t('channels.globalMap')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('channels.allocationDesc')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-xs text-gray-400">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Laptop className="h-3.5 w-3.5 text-emerald-400" />
                      {t('channels.slaDigital')}
                    </span>
                    <span>{t('channels.avgResponseTime')}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                    <span>{t('channels.bilingualTeam')}</span>
                    <span className="text-emerald-200">{t('channels.available')}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs text-gray-400">
                <span>Notas internas</span>
                <Input
                  placeholder="Ex.: Integrar Salesforce Service Cloud até 15/12"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-[#EC4899]/60 focus:outline-none"
                />
                <Button
                  variant="outline"
                  className="self-end rounded-2xl border-white/20 bg-black/40 text-xs text-gray-200"
                >
                  Salvar nota
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Modal de Configuração de Perfil WhatsApp Business */}
        <Dialog
          open={isProfileModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseProfileModal();
            }
          }}
        >
          <DialogContent className="max-w-2xl border-white/10 bg-black/90 text-white max-h-[85vh] overflow-y-auto">
            <div className="relative overflow-hidden rounded-[2rem]">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#EC4899]/12 via-transparent to-[#111117]/60" />
              <div className="space-y-6 px-6 py-7 sm:px-8">
                <DialogHeader className="space-y-3 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.12] text-lg font-semibold text-white shadow-[0_25px_60px_-45px_rgba(0,0,0,0.55)]">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-white sm:text-2xl">
                        Configurar Perfil WhatsApp Business
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-200/70">
                        {selectedNumberForProfile || "Número WhatsApp"}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {isLoadingProfile ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Nome de Exibição
                      </label>
                      <Input
                        type="text"
                        placeholder="Nome da sua empresa"
                        value={profileData.display_name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            display_name: e.target.value,
                          })
                        }
                        className="bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        Pode ser alterado apenas 1x a cada 30 dias
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Descrição
                      </label>
                      <Input
                        type="text"
                        placeholder="Descrição do seu negócio"
                        value={profileData.description}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            description: e.target.value,
                          })
                        }
                        className="bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
                        maxLength={139}
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        Máximo 139 caracteres
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Categoria
                      </label>
                      <Input
                        type="text"
                        placeholder="Ex: E-commerce, Serviços, etc."
                        value={profileData.category}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            category: e.target.value,
                          })
                        }
                        className="bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Website
                      </label>
                      <Input
                        type="url"
                        placeholder="https://seusite.com"
                        value={profileData.website}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            website: e.target.value,
                          })
                        }
                        className="bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Endereço
                      </label>
                      <Input
                        type="text"
                        placeholder="Endereço físico do negócio"
                        value={profileData.address}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: e.target.value,
                          })
                        }
                        className="bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="contato@seusite.com"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            email: e.target.value,
                          })
                        }
                        className="bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        URL da Imagem de Perfil
                      </label>
                      <Input
                        type="url"
                        placeholder="https://seusite.com/imagem-perfil.jpg"
                        value={profileData.profile_image_url}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            profile_image_url: e.target.value,
                          })
                        }
                        className="bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        640x640px, PNG ou JPG, máx 5MB
                      </p>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={handleCloseProfileModal}
                    disabled={isSavingProfile}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || isLoadingProfile}
                    className="gap-2"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Salvar Perfil
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}
