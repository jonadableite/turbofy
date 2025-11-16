import { memo } from "react";
import {
  QrCode,
  FileText,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { PaymentInteractionEntry } from "@/hooks/use-dashboard";
import { cn } from "@/lib/utils";

interface PaymentActivityTimelineProps {
  interactions: PaymentInteractionEntry[];
  formatCurrency: (value: number) => string;
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  CHARGE_CREATED: {
    label: "Cobrança criada",
    icon: ShoppingCart,
    badgeClass: "bg-blue-500/15 text-blue-500",
  },
  PIX_ISSUED: {
    label: "Pix emitido",
    icon: QrCode,
    badgeClass: "bg-emerald-500/15 text-emerald-500",
  },
  BOLETO_ISSUED: {
    label: "Boleto emitido",
    icon: FileText,
    badgeClass: "bg-indigo-500/15 text-indigo-500",
  },
  CHARGE_PAID: {
    label: "Cobrança paga",
    icon: CheckCircle2,
    badgeClass: "bg-green-500/15 text-green-500",
  },
  CHARGE_EXPIRED: {
    label: "Cobrança expirada/cancelada",
    icon: XCircle,
    badgeClass: "bg-red-500/15 text-red-500",
  },
  CHECKOUT_SESSION_CREATED: {
    label: "Sessão de checkout criada",
    icon: Sparkles,
    badgeClass: "bg-purple-500/15 text-purple-500",
  },
};

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDate));

export const PaymentActivityTimeline = memo(function PaymentActivityTimeline({
  interactions,
  formatCurrency,
}: PaymentActivityTimelineProps) {
  if (!interactions.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold">Últimas interações de pagamento</p>
        <p className="text-xs text-muted-foreground">
          Eventos em tempo real gerados pelo gateway
        </p>
      </div>
      <div className="divide-y divide-border/60">
        {interactions.map((interaction) => {
          const config = typeConfig[interaction.type] ?? {
            label: interaction.type,
            icon: Sparkles,
            badgeClass: "bg-muted text-foreground",
          };
          const Icon = config.icon;
          const amount =
            typeof interaction.amountCents === "number"
              ? formatCurrency(interaction.amountCents)
              : "—";

          return (
            <div
              key={interaction.id}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div
                className={cn(
                  "mt-1 rounded-full p-2 text-xs font-semibold",
                  config.badgeClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{config.label}</p>
                  {interaction.method && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      {interaction.method}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {interaction.user?.email
                    ? `Por ${interaction.user.email}`
                    : interaction.provider
                    ? `Provider: ${interaction.provider}`
                    : "Evento automático"}
                </p>
                {interaction.chargeId && (
                  <p className="text-xs text-muted-foreground">
                    Charge: <span className="font-mono">{interaction.chargeId}</span>
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{amount}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(interaction.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

