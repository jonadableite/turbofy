# Turbofy Frontend (Next.js App Router)

Interface SaaS do gateway de pagamentos Turbofy. Entrega dashboards administrativos e experiências de checkout white-label para clientes finais.

---

## 🚀 Stack
- Next.js 16 (App Router) + React 19 (Server Components por padrão)
- TypeScript strict
- TailwindCSS v4 + shadcn/ui + Magic UI + Aceternity UI
- Framer Motion, `next-themes`, `react-hook-form` + Zod

Para convenções detalhadas consulte `frontend/PROJECT_RULES.md`.

---

## 🧰 Pré-requisitos
- Node.js 20+
- pnpm 9+
- Backend ativo (porta padrão `3000`)

---

## ⚙️ Setup
```bash
# Instalar dependências do monorepo
pnpm install

# Configurar variáveis
cp frontend/.env.example frontend/.env
# Ajuste NEXT_PUBLIC_API_URL (ex.: http://localhost:3000)

# Rodar app
pnpm --filter frontend dev
```

---

## 📜 Scripts Principais
| Comando | Descrição |
| --- | --- |
| `pnpm --filter frontend dev` | Dev server com hot reload. |
| `pnpm --filter frontend build` | Build de produção (`next build`). |
| `pnpm --filter frontend start` | Servir build gerado. |
| `pnpm --filter frontend lint` | ESLint + regras de acessibilidade. |
| `pnpm --filter frontend type-check` | TypeScript `tsc --noEmit`. |
| `pnpm --filter frontend test` | Vitest + Testing Library. |

---

## 🌐 Integração com a API
1. Suba o backend (`pnpm --filter backend dev`).
2. Defina `NEXT_PUBLIC_API_URL` apontando para o backend.
3. Fluxos críticos:
   - `POST /checkout/sessions` (cria sessão white-label)
   - `GET /checkout/sessions/:id` (carrega sessão para o `PaymentSelector`)
   - `POST /checkout/charges/:id/issue` (gera Pix/Boleto sob demanda)
4. Todos os fetches de cliente usam `process.env.NEXT_PUBLIC_API_URL`.

---

## 🗂️ Estrutura
```
frontend/src/
├── app/                 # App Router (auth, dashboard, checkout)
├── components/          # Componentes compartilhados (ex.: checkout/PaymentSelector.tsx)
├── contexts/            # Context API (auth, tema)
├── hooks/               # Hooks customizados
├── lib/                 # Utilitários e clients
├── ui/                  # Variantes shadcn/ui + cva
└── __tests__/           # Suites de UI e integração
```

Tokens e temas: `tailwind.config.ts`. Convenções completas: `frontend/PROJECT_RULES.md`.

---

## 🎨 Diretrizes Essenciais
- Mobile-first, estética premium/cybersecurity e responsividade total.
- Priorize Server Components; Client Components só com interatividade real.
- Formulários: `react-hook-form` + Zod; feedbacks com shadcn/ui + sonner.
- Animações com Framer Motion respeitando `prefers-reduced-motion`.
- Cores em OKLCH, contraste ≥ 4.5:1 e navegação por teclado garantida.

---

## ✅ Qualidade
```bash
pnpm --filter frontend lint
pnpm --filter frontend type-check
pnpm --filter frontend test
```
- Use Vitest + Testing Library para componentes.
- Para fluxos críticos considere Playwright (adicionar scripts em `package.json`).

---

## 📚 Documentos Relacionados
- `PROJECT_RULES.md` – Regras globais do monorepo.
- `frontend/PROJECT_RULES.md` – Guia completo de UI/UX e engenharia.
- `backend/docs/checkout.md` – Contratos e sequência do checkout.
- `backend/docs/payment-providers.md` – Origem dos dados de Pix/Boleto.

Atualize este README sempre que comportamentos/frameworks mudarem. Mantê-lo vivo garante onboarding rápido e execução consistente.
