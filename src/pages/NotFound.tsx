import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.warn("app.not_found", { path: location.pathname });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ease-in-out">
      {/* Gradiente do modo claro - mesmo do login */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-200 to-orange-200 dark:hidden" />
      
      {/* Gradiente do modo escuro - mesmo do login */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#252440] to-[#000020] hidden dark:block" />
      
      {/* Padrão de fundo específico - mesmo do login */}
      <div className="fixed inset-0 opacity-20 dark:opacity-15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.08),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(251,146,60,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(30,58,138,0.2),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(30,64,175,0.15),transparent_50%)]" />
      </div>
      
      <div className="relative z-10 text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-700 dark:text-gray-300">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">{t("common.notFound.oops")}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">
          {t("common.notFound.backHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
