import type { Metadata } from "next";
import "../globals.css";
import Providers from "@/components/Providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import StoreProvider from "@/app/StoreProvider";
import { cn } from "@/lib/utils";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";
import { cookies } from "next/headers";
import { getBusinessBlueprint, getTenantRegistry } from "@/lib/getPageData";
import { getAuthUser } from "@/lib/getSingleUser";
import BrandingInitializer from "@/components/branding/BrandingInitializer";
import BusinessBlueprintDataInitialiser from "@/components/businessBluePrints/BusinessBlueprintDataInitialiser";
import ThemeInitializer from "@/components/theme/ThemeInitializer";
import GetUser from "@/lib/GetAllDetails/GetUser";
import ThemeProvider from "@/components/ThemeProvider";
import { Inter } from "next/font/google";
import FetchAllData from "@/components/pages/FetchAllData";
import EditModeToggle from "@/components/EditModeToggle/EditModeToggle";


const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

function resolveFavicon(brandConfig: any) {
  return brandConfig?.faviconUrl ||
    brandConfig?.brandKit?.logo?.favicon ||
    brandConfig?.brandKit?.faviconUrl ||
    brandConfig?.business?.brand?.faviconRef ||
    brandConfig?.business?.brand?.businessDna?.faviconUrl ||
    "/assets/Image/favicon.svg";
}

export async function generateMetadata(): Promise<Metadata> {
  const brandConfig = await getTenantRegistry();
  const favicon = resolveFavicon(brandConfig);
  return {
    title: "NestCraft Interiors",
    description: "Design-led interiors and furniture storefront built with Next.js.",
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || process.env.DB_NAME;
  const authCookieNames = [
    tenantId ? `${tenantId}_auth_token` : null,
    tenantId ? `auth_token_${tenantId}` : null,
    "kalp_session",
    "auth_token",
    "admin_token",
  ].filter(Boolean) as string[];
  const token = authCookieNames
    .map((name) => cookieStore.get(name)?.value)
    .find(Boolean);

  const [tenantRegistry, businessBlueprint, user] = await Promise.all([
    getTenantRegistry(),
    getBusinessBlueprint(),
    token ? getAuthUser(token).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <html
      lang={locale || "en"}
      suppressHydrationWarning
      className={cn("font-sans", inter.variable)}
    >
      <body>
        {/* <ChunkErrorRecovery /> */}
        <StoreProvider>
          <BrandingInitializer initialConfig={tenantRegistry} />
          <BusinessBlueprintDataInitialiser
            businessBlueprint={businessBlueprint}
          />
          <ThemeInitializer />
          <Providers>
            <GetUser user={user} />
            <FetchAllData />
            <ThemeProvider businessBlueprint={businessBlueprint}>
              <LayoutWrapper brandConfig={tenantRegistry}>
                {children}
              </LayoutWrapper>
            </ThemeProvider>
            <EditModeToggle />
          </Providers>
        </StoreProvider>
      </body>
    </html>
  );
}
