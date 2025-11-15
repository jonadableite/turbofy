## Objetivo
- Entregar um checkout white‑label, altamente personalizável (logo, cores, tipografia, layout, microinterações) para clientes Turbofy integrarem em sites, lojas e apps.
- Suportar Pix e Boleto inicialmente, com arquitetura pronta para novos métodos.
- Disponibilizar duas formas de uso: Hosted Checkout (URL Turbofy) e Embed via script/iframe.

## UX e Personalização
- Tema configurável por cliente: logo, paleta OKLCH, fontes, bordas, animações, dark/light, copy, rodapé e política.
- Layout moderno e responsivo (mobile‑first), estética premium/cybersecurity, microinterações leves (Magic UI, Aceternity UI, Framer Motion).
- Acessibilidade AA: foco, ARIA, contraste, teclado, sem bloqueios.
- Estado claro: emissão Pix (QR + copiar e colar), geração de boleto, contagem regressiva de expiração, toasts, skeletons.

## Arquitetura (Hexagonal)
- Domain: novas entidades `CheckoutConfig`, `CheckoutSession` (snapshot de tema + preferências/métodos).
- Application: casos de uso `CreateCheckoutSession`, `IssuePaymentForCharge`, `GetCheckoutConfig`, `UpdateCheckoutConfig`.
- Ports: `CheckoutConfigRepository`, `CheckoutSessionRepository`.
- Infra: adapters Prisma p/ repositórios, rotas HTTP, esquema Zod, mensageria RabbitMQ já utilizada.

## Back-end (Node + TS + Prisma)
- Banco (Prisma):
  - `checkout_configs` (tenantId, logoUrl, theme tokens OKLCH, fontes, radius, spacing, flags UI, updatedAt, createdAt).
  - `checkout_sessions` (id, chargeId, merchantId, status [created|opened|completed|expired], themeSnapshot JSON, returnUrl, cancelUrl, expiresAt, createdAt).
- Casos de uso:
  - `CreateCheckoutSession`: recebe `merchantId`, `amountCents`, opcional `externalRef`/`metadata`; cria `Charge` PENDING sem `method`; persiste `CheckoutSession` e retorna `sessionId` + URL.
  - `IssuePaymentForCharge`: dado `chargeId` + `method` (PIX|BOLETO), emite via `PaymentProviderPort` e atualiza `Charge`.
  - `Get/UpdateCheckoutConfig`: CRUD seguro por tenant.
- HTTP APIs (Express):
  - `POST /checkout/sessions` com header `X-Idempotency-Key` (segue padrão do `POST /charges` em `backend/src/infrastructure/http/routes/chargesRoutes.ts:22`).
  - `GET /checkout/sessions/:id` retorna estado do checkout + dados do charge (sem dados sensíveis).
  - `POST /charges/:id/issue` seleciona e emite método de pagamento (usa `IssuePaymentForCharge`). Ponto de extensão se baseia na lógica de emissão atual em `backend/src/application/useCases/CreateCharge.ts:154` (PIX) e `:163` (Boleto).
  - `GET /checkout/config` e `PUT /checkout/config` por merchant autenticado.
- Eventos: publicar `checkout.session.created`, `checkout.session.completed`, reusar `charge.created` e `charge.paid`.
- Segurança: validação Zod, idempotência, rate‑limit, CSRF para painéis, assinatura de webhooks, segregação por `merchantId`.

## Front-end (Next.js App Router)
- Hosted Checkout: `src/app/checkout/[sessionId]/page.tsx` (Server Component + Client islands):
  - Busca server‑side a sessão e o snapshot de tema; aplica via CSS variables (OKLCH) e Tailwind tokens.
  - Fluxo: usuário escolhe método (PIX/BOLETO) → chama `POST /charges/:id/issue` → renderiza QR Pix/copia e cola ou link do boleto.
  - UI premium: glassmorphism sutil, neon borders, motion leve, sem CLS; componentes shadcn/ui.
  - A11y: foco gerenciado, leitor de tela, labels, tamanho de alvo táctil ≥ 44px.
- Engine de Tema:
  - `ThemeProvider` que injeta tokens do merchant (cores OKLCH, fonte, radius) e mapeia para classes utilitárias.
  - Upload de logo no dashboard com otimização (Next Image) e fallback.

## SDK de Embed
- Script leve para sites dos clientes:
  - Snippet:
    - `<script src="https://cdn.turbofy.com/checkout.js" data-session-id="SESSION_ID" data-theme="{...}" data-origin="https://checkout.turbofy.com"></script>`
  - O script cria um `<iframe>` responsivo apontando para `https://checkout.turbofy.com/checkout/SESSION_ID`.
  - Comunicação `postMessage` p/ eventos: `checkout.loaded`, `checkout.payment_issued`, `checkout.completed`, `checkout.closed`.
  - Callbacks: permitir função global `onTurbofyCheckoutEvent(event)`.
- CSP estrita e `allow` do iframe apenas o necessário.

## Dashboard de Branding
- Página no Dashboard: `src/app/(dashboard)/settings/checkout/page.tsx`.
- Formulário com `react-hook-form` + Zod: logo, paleta OKLCH, fonte, radius, animações, texto legal.
- Preview ao vivo do checkout em um sandbox.

## Segurança e Compliance
- LGPD: dados mínimos no checkout, evitar coleta de PII além do necessário.
- Segredos nunca no client; tudo SSR ou server actions. Cookies `HttpOnly` quando aplicável.
- Anti‑fraude: reCAPTCHA leve opcional para ambientes de risco (infra de `backend/src/infrastructure/security/recaptcha.ts`).
- Anti‑clickjacking: `X-Frame-Options` apenas para dominios permitidos; `frame-ancestors` via CSP.

## Observabilidade
- OpenTelemetry: traceId em todas as requisições do checkout e APIs.
- Logs estruturados (info/warn/error) com `useCase`, `entityId`, `traceId`.
- Métricas: tempo de emissão Pix/Boleto, taxa de conversão, abandono.

## Testes
- Back-end: unit `CreateCheckoutSession` e `IssuePaymentForCharge`; integração Prisma; e2e para APIs.
- Front-end: Testing Library para acessibilidade e estados; Playwright E2E do fluxo completo (criar sessão → emitir pagamento → concluir).
- Menos flakiness: usar `testcontainers` para banco e MQ quando necessário; encerrar conexões sempre.

## Entregáveis por Fase
- Fase 1: Modelo Prisma, repositórios e casos de uso (CreateCheckoutSession, IssuePaymentForCharge), rotas básicas.
- Fase 2: Hosted Checkout page com engine de tema e UX premium.
- Fase 3: SDK de Embed (iframe + postMessage) e snippet público.
- Fase 4: Dashboard de Branding com preview em tempo real.
- Fase 5: Segurança (CSP, X‑Frame‑Options, rate limit), Observabilidade (OTel), testes E2E.
- Fase 6: Documentação de integração (snippets, eventos, APIs) e exemplos.

## Integrações e Pontos de Extensão Existentes
- Emissão de pagamento: `PaymentProviderFactory` (backend/src/infrastructure/adapters/payment/PaymentProviderFactory.ts:19) seleciona provider;
- Criação de cobrança: `POST /charges` (backend/src/infrastructure/http/routes/chargesRoutes.ts:22) e emissão Pix/Boleto em `CreateCharge` (backend/src/application/useCases/CreateCharge.ts:154, :163). Essas lógicas serão reaproveitadas via `IssuePaymentForCharge`.

## Snippet de Uso (Hosted + Redirect)
- Criar sessão e redirecionar:
  - `POST /checkout/sessions` → `{ id, url }`
  - Frontend do cliente faz `window.location.href = url`.

## Snippet de Uso (Embed)
- Inserir no site:
  - `<div id="turbofy-checkout"></div>`
  - `<script src="https://cdn.turbofy.com/checkout.js" data-session-id="SESSION_ID"></script>`

## Critérios de Aceite
- Checkout carrega < 2s em 4G, totalmente responsivo.
- Tema aplica corretamente logo/cores/tipografia e persiste por merchant.
- Pix/Boleto funcionam ponta‑a‑ponta com eventos e webhooks.
- A11y AA, sem CLS; testes E2E passam.
- Segurança: CSP, frame‑ancestors, sem exposição de segredos.
