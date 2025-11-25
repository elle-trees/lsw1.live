import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e1e2e] text-ctp-text py-8 px-4">
      <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] via-[hsl(240,21%,14%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-2xl max-w-lg w-full">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#cba6f7]/20 blur-3xl rounded-full animate-pulse"></div>
              <AlertCircle className="h-16 w-16 text-[#cba6f7] relative z-10" />
            </div>
          </div>
          <CardTitle className="text-7xl font-bold mb-2 bg-gradient-to-r from-[#cba6f7] via-[#f5c2e7] to-[#cba6f7] bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
            {t("notFound.title")}
          </CardTitle>
          <h2 className="text-3xl font-bold text-ctp-text mb-2">{t("notFound.heading")}</h2>
          <p className="text-lg text-ctp-overlay0">
            {t("notFound.description")}
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            asChild
            size="lg"
            className="bg-gradient-to-r from-[#cba6f7] to-[#b4a0e2] hover:from-[#b4a0e2] hover:to-[#cba6f7] text-[hsl(240,21%,15%)] font-bold shadow-lg hover:shadow-xl hover:shadow-[#cba6f7]/30 transition-all duration-300 hover:scale-105"
          >
        <Link to="/" params={undefined}>
            <Home className="mr-2 h-5 w-5" />
            {t("notFound.returnToHome")}
            </Link>
          </Button>
        </CardContent>
      </Card>
      
      <style>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default NotFound;