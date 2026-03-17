import Layout from "../components/Layout";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useTranslation } from "react-i18next";
import ProfileSection from "../components/settings/ProfileSection";
import SecuritySection from "../components/settings/SecuritySection";
import SessionsSection from "../components/settings/SessionsSection";
import AvailabilitySection from "../components/settings/AvailabilitySection";

export default function Settings() {
  useRequireAuth();
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-black via-[#0f0f10] to-black">
        <header className="rounded-3xl border border-white/10 bg-white/[0.05] px-8 py-6 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {t('settings.header.breadcrumb')}
              </p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {t('settings.header.title')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                {t('settings.header.subtitle')}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-10 space-y-8">
          {/* Profile Section */}
          <ProfileSection />

          {/* Security Section */}
          <SecuritySection />

          {/* Availability Section - Horários de atendimento e agendamento */}
          <AvailabilitySection />

          {/* Sessions Section */}
          <SessionsSection />
        </div>
      </div>
    </Layout>
  );
}
