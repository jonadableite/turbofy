"use client";

import { useState } from "react";
import { RouteGuard } from "@/components/routing/route-guard";
import { Sidebar, SidebarBody, SidebarLink, SidebarSection } from "@/components/ui/sidebar";
import { Logo, LogoIcon } from "@/components/sidebar-demo";
import { cn } from "@/lib/utils";
import {
  IconBrandTabler,
  IconShoppingCart,
  IconChartLine,
  IconUsers,
  IconAffiliate,
  IconSettings,
  IconPlug,
  IconCreditCard,
} from "@tabler/icons-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarLinks = [
    { label: "Dashboard", href: "/dashboard", icon: <IconBrandTabler className="h-5 w-5 shrink-0 text-primary" /> },
    { label: "Vitrine", href: "/vitrine", icon: <IconShoppingCart className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Vendas", href: "/vendas", icon: <IconChartLine className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Financeiro", href: "/financeiro", icon: <IconSettings className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Clientes", href: "/clientes", icon: <IconUsers className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Afiliados", href: "/afiliados", icon: <IconAffiliate className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Produtos", href: "/produtos", icon: <IconPlug className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Configurações", href: "/configuracoes", icon: <IconSettings className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Integrações", href: "/integracoes", icon: <IconPlug className="h-5 w-5 shrink-0 text-foreground" /> },
    { label: "Checkout", href: "/settings/checkout", icon: <IconCreditCard className="h-5 w-5 shrink-0 text-foreground" /> },
  ];

  const salesLabels = ["Vitrine", "Vendas", "Clientes", "Afiliados", "Produtos"] as const;
  const financeLabels = ["Financeiro", "Integrações", "Configurações", "Checkout"] as const;

  const dashboardLink = sidebarLinks.find((l) => l.label === "Dashboard");
  const salesLinks = sidebarLinks.filter((l) => salesLabels.includes(l.label as typeof salesLabels[number]));
  const financeLinks = sidebarLinks.filter((l) => financeLabels.includes(l.label as typeof financeLabels[number]));

  return (
    <RouteGuard requireAuth>
      <div className="flex h-screen bg-background">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} variant="flat">
          <SidebarBody className="justify-between gap-8">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
              <div className="mb-6 pr-10">{sidebarOpen ? <Logo /> : <LogoIcon />}</div>
              <div className="flex flex-col gap-4">
                {dashboardLink && (
                  <SidebarLink
                    link={dashboardLink}
                    className={cn("bg-primary/20 text-primary font-semibold border-l-2 border-primary")}
                  />
                )}
                <SidebarSection title="Área de Vendas">
                  {salesLinks.map((link, idx) => (
                    <SidebarLink key={`sales-${idx}`} link={link} />
                  ))}
                </SidebarSection>
                <SidebarSection title="Financeiro">
                  {financeLinks.map((link, idx) => (
                    <SidebarLink key={`fin-${idx}`} link={link} />
                  ))}
                </SidebarSection>
              </div>
            </div>
          </SidebarBody>
        </Sidebar>

        <div className="flex flex-1 flex-col bg-transparent">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </RouteGuard>
  );
}
