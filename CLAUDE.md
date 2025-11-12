Turbofy — Regras do Projeto e Guia de Engenharia

**Propósito**

- Construir um gateway de pagamentos SaaS com Dashboard intuítivo e seguro.
- Suportar criação de cobranças, relatórios/extratos, gestão de chaves Pix/boletos e acompanhamento de taxas.
- Garantir split de pagamentos, repasses e conciliação bancária automática.

**Princípios de Engenharia**

- SOLID, Clean Code, arquitetura Hexagonal, design orientado ao domínio.
- TypeScript com `strict` e type-safe; evitar `any` e casts inseguros.
- Idempotência em operações financeiras e tolerância a falhas.
- Observabilidade: logs estruturados, métricas, traços e auditoria.
- Segurança e privacidade: LGPD by design, segregação de dados e mínima exposição.

**Stack e Escopo**

- Backend: Node.js + TypeScript, PostgreSQL com Prisma ORM, RabbitMQ para eventos.
- Infra: IaC com SST (stacks por ambiente: `dev`, `staging`, `prod`).
- Frontend: React + Next.js (App Router), TailwindCSS, shadcn/ui, ui.aceternity, Magic UI.
- Conta PJ em instituição financeira para recebimento e repasses.

**Estrutura do Repositório (atual)**

- `backend/src/domain` entidades e regras de negócio.
- `backend/src/application` casos de uso e orquestração.
- `backend/src/ports` interfaces (ports) para serviços externos.
- `backend/src/infrastructure` implementações de adapters: DB, MQ, HTTP, integrações.
- `frontend/src/app` páginas e layouts do Dashboard.

**Arquitetura Hexagonal (Back-end)**

- Domain: entidades e serviços de domínio (`Charge`, `SplitRule`, `Settlement`, `Reconciliation`, `PixKey`, `Boleto`, `Fee`).
- Application: casos de uso (`CreateCharge`, `ApplySplit`, `CapturePayment`, `ScheduleSettlement`, `RunReconciliation`, `RegisterPixKey`, `GenerateBoleto`).
- Ports: interfaces (`PaymentProviderPort`, `BankingPort`, `MessagingPort`, `ChargeRepository`, `SettlementRepository`, `ReconciliationRepository`).
- Infrastructure: adapters (`PrismaChargeRepository`, `RabbitMQMessagingAdapter`, `HTTPController`, `BankingAdapter`).

**Fluxos Financeiros Essenciais**

- Criação de cobrança: validação, persistência, emissão (Pix/Boleto), idempotência por `idempotencyKey`.
- Split de pagamentos: regras por percentual/valor, prioridades e limites; registrar distribuição de taxas.
- Repasses (payout): cálculo de saldo, agendamento e execução via conta PJ; auditoria completa.
- Conciliação automática: ingestão de extratos, matching por `referenceId`, estados de reconciliação, reprocessos.

**Mensageria (RabbitMQ)**

- Exchanges (topic): `turbofy.payments`, `turbofy.billing`, `turbofy.reconciliation`.
- Chaves de roteamento: `charge.created`, `charge.paid`, `settlement.requested`, `settlement.completed`, `reconciliation.started`, `reconciliation.completed`.
- Mensagens JSON com campos: `id`, `type`, `timestamp`, `version`, `traceId`, `idempotencyKey`, `payload` (tipado via schemas).
- Garantias: filas duráveis, confirm channels, reentrega com backoff, DLQ por tipo.
- Prefetch controlado e consumidores idempotentes; deduplicação por `idempotencyKey`.

**Banco de Dados (PostgreSQL + Prisma)**

- Montante em unidade mínima (`amount_cents`), `currency = 'BRL'`.
- Identificadores UUID; índices únicos para chaves de negócio (`external_ref`, `idempotency_key`).
- Tabelas principais: `charges`, `charge_splits`, `settlements`, `reconciliations`, `pix_keys`, `boletos`, `fees`, `audit_logs`.
- Migrações versionadas; seed apenas para ambientes não produtivos.
- Integridade referencial e constraints; evitar cascatas destrutivas.

**Back-end: Convenções e Boas Práticas**

- Controladores finos; lógica em casos de uso. Não acoplar infra ao domínio.
- Validação de entrada com schemas (ex.: zod) e mapeamento para DTOs.
- Erros: tipos específicos (`DomainError`, `ValidationError`, `InfrastructureError`), mapeamento para HTTP.
- Idempotência: header `Idempotency-Key` e persistência de chave/resultado; proteger contra duplicidade.
- Logs estruturados: incluir `traceId`, `useCase`, `entityId`, nível (`info`, `warn`, `error`).
- Testes: unitários no domínio, integração com Prisma/RabbitMQ (testcontainers), e2e para APIs críticas.

**Frontend (Dashboard SaaS)**

- Next.js App Router, roteamento segmentado por área: `cobranças`, `relatórios`, `pix-e-boletos`, `taxas`.
- shadcn/ui para componentes base; Tailwind como utilitário; ui.aceternity e Magic UI para microinterações.
- Formulários com `react-hook-form` + `zod`; feedbacks claros e acessíveis.
- Data fetching: `useSWR`/server actions; schemas para dados; estados de carregamento/erro padronizados.
- Tabelas com paginação/filtragem; gráficos para receitas, taxas, repasses; export de relatórios.

**Segurança e Compliance**

- LGPD: minimização de dados, consentimento quando aplicável, direito de acesso/remoção.
- Segredos e chaves em armazenamento seguro (SST Secrets/Parameter Store); jamais em repositório.
- Criptografia em repouso (RDS) e em trânsito (TLS); assinar webhooks.
- Rate limiting e proteção anti-fraude; validação forte de entradas.
- Auditoria: trilhas de auditoria para ações críticas (criar/alterar cobranças, repasses, chaves Pix).
- Backups e plano de recuperação; retenção conforme exigência legal.

**IaC com SST**

- Stacks por domínio: `core` (VPC, secrets), `data` (Postgres), `mq` (RabbitMQ), `api` (lambda/API gateway ou ECS), `frontend` (Next.js em edge/Lambda).
- Nomenclatura: `turbofy-<stack>-<env>`; tags de recursos para rastreabilidade (`project=Turbofy`, `env`).
- Variáveis de ambiente prefixadas `TURBOFY_...`; segregação por ambiente.
- Deploys com gates de qualidade (type-check, lint, testes, migrações dry-run).

**Observabilidade**

- OpenTelemetry com export de traces/metrics/logs (sempre `traceId`).
- Dashboards para latência, throughput, erros, tempo de reconciliação e sucesso de repasses.
- Alertas por SLOs (ex.: falhas em `settlement.completed`, atraso de conciliação > X horas).

**Convenções de Código, Git e PR**

- TypeScript `strict`; sem `any`; nomes descritivos; funções pequenas.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`); PRs pequenos e focados.
- Branches: `main`, `develop`; feature branches `feat/<area>/<resumo>`.
- Revisão obrigatória; checklists de testes e segurança; proibir merges sem aprovação.

**Qualidade e Gates**

- Obrigatório: type-check, lint, testes (unit/integration), cobertura mínima para domínio.
- Segurança: verificação de dependências, secrets, linters de IaC.
- Build e deploy travam se algum gate falhar; sem exceções em `prod`.

**Regras para Agentes (Trae e Cursor)**

- Manter mudanças cirúrgicas e coerentes com a arquitetura hexagonal.
- Criar tarefas quando a atividade tiver várias etapas; atualizar status conforme avanço.
- Editar arquivos de forma estruturada; evitar mudanças manuais sem rastreabilidade.
- Para mudanças de UI, validar visualmente no ambiente de desenvolvimento antes de concluir.
- Não modificar áreas não relacionadas; quando necessário, documentar a razão com clareza.
- Priorizar correção na causa raiz e código simples; evitar over-engineering.
- Seguir convenções de commits/PR e padrões de qualidade antes de abrir merge.

**Nomes e Padrões**

- Prefixos: `TURBOFY_` para env vars; exchanges/filas `turbofy.*`.
- Entidades de domínio com nomes claros; evitar abreviações obscuras.
- IDs como UUID v4; referências externas com campos dedicados (`external_ref`).

**Próximos Passos Sugeridos**

- Definir schemas iniciais de domínio e eventos.
- Mapear integrações bancárias para conta PJ e webhooks.
- Planejar migrações de banco e filas por ambiente via SST.

**Numca faça**

- Evite sempre usar any
- Numca crie codigos basicos sempre crie codigos completos e profissionais

**Code Sandards**

- SEMPRE mova magic numbers para consantes.
- O nome de um metodo ou funçao deve ser sempre um verbo, e nunca um substantivo.
- NUNCA faça o aninhamento de um ou mais if/else de preferencia para early returns.
- Evite ao maximo repetiçao de codigo. Preffira mover logicas para funçoes e classes para evitar duplicidade.
- Declare as variaveis o mais proximo possivel de onde serao utilizadas.
- Use PascalCase para classes e interfaces.
- Use camelCase para declaraçao de metodos funçoes e variaveis.
- Use kebab-case para arquivos e diretorios.

**TypeScript**

- Utilize pnpm como ferramentta para gerenciar dependencias e executar scripts
- Use const ao inves de let sempre que possivel
- SEMPRE use interfaces ao inves de types (exceto quando types forem estritamente necessarios)
- Prefira usar arrow functions e nao funçoes convencionais.
- SEMPRE utilize aync/await para lidar com Promises.
- NUNCA ultilize any, sempre use types existentes ou crie novos quando necessario.
- NUNCA ultilize var para declarar uma variavel, prefira sempre cons ou let.
- Caso um metodo ou funçao receba mais de 2 parametros, SEMPRE utilize um objeto como parametro para receber esses valores.

**Node.js**

- Prefira usar bibliotecas nativas como Node.js antes de instalar bibliotecas (crypto.randomUUID ao inves de uuidv4, por exemplo)
- SEMPRE use named exports, NUNCA default exports.
- Use Jest para escrever testes.
- Siga o principio de Arrange Act Assert nos testes.
- Crie testes para todos os use cases e use a biblioteca testcontainers para subir banco de dados de teste, quando necessario.
- SEMPRE encerre conexoes com banco de dados ou mensageria depois de executar os testes.
- SEMPRE siga Arquitetura Hexagonal nas suas tarefas. Uma rota deve ser SEMPRE divida em Driver, Application e Resource.

**React/Next.js**

- Framework base: **Next.js (App Router)** com React 18+, otimizado para SSR/SSG/ISR e edge runtime.
- Estilo e design system: **TailwindCSS v4**, **shadcn/ui**, **Magic UI** e **Aceternity UI**.
- O frontend deve ser **totalmente responsivo**, adaptável para **desktop e mobile**, priorizando experiência “**app-like**” e estética **premium/cybersecurity**.

**Arquitetura e Estrutura**

- `src/app` → App Router (layouts, routes e server components).
- `src/components` → componentes atômicos reutilizáveis (PascalCase).
- `src/features` → domínios funcionais (ex.: cobranças, repasses, conciliação).
- `src/hooks` → hooks customizados (`use-` prefix).
- `src/lib` → utilitários, funções helpers e clientes de API.
- `src/styles` → tokens, temas e variáveis globais Tailwind.
- `src/ui` → extensões do shadcn/ui e variantes com CVA.
- `public/` → assets estáticos, ícones, manifest e service worker (PWA).

**Design System e UI**

- Basear-se no **shadcn/ui** para consistência, acessibilidade e tipagem.
- **Magic UI** e **Aceternity UI** podem ser usados para microinterações, efeitos e transições — sempre com revisão de performance e acessibilidade.
- Utilizar **class-variance-authority (CVA)** e `cn()` para variantes visuais e composição de estilos.
- Tokens centralizados (cores, espaçamentos, fontes, bordas) em `tailwind.config.ts`.
- Usar **OKLCH** para definição de cores, garantindo contraste e consistência visual.
- Layout **mobile-first**; design fluido e otimizado para telas menores.

**Componentes e Convenções**

- Componentes nomeados com **PascalCase** e exportados de forma nomeada (`export const Component = ...`).
- Arquivos e diretórios em **kebab-case**.
- Props tipadas via **interfaces**, nunca `any` ou `type` genéricos.
- Evitar componentes acima de 300 linhas — extrair lógica para hooks (`src/hooks`) ou helpers (`src/lib`).
- Todos os componentes devem ser acessíveis (ARIA, roles, labels, foco).

**Server e Client Components**

- Usar **Server Components** por padrão para SSR e segurança.
- Usar **Client Components** apenas quando houver interatividade (forms, animações, etc.).
- Server Actions para operações seguras (ex.: criar cobrança, gerar boleto).
- Endpoints em `app/api/.../route.ts` para webhooks e handlers dedicados.

**Data Fetching e Estado**

- Server-side data fetching com revalidação (`revalidate`, `no-store`, etc.).
- **useSWR** ou **React Query** apenas para dados reativos client-side.
- Tipar responses com **Zod schemas** (validação e parsing).
- Nunca expor segredos no cliente; dados sensíveis sempre carregados via Server Components.

**Formulários e Validação**

- Usar **react-hook-form** + **zod** para validação tipada e feedbacks de erro.
- Feedbacks visuais com **toasts** (shadcn/ui + sonner).
- Idempotência garantida via `Idempotency-Key` e UI com estados de carregamento.
- Campos sensíveis mascarados e com validação sanitizada.

**Acessibilidade (A11y)**

- Cumprir **WCAG 2.1 nível AA**.
- Contraste mínimo 4.5:1 para textos.
- Suporte completo a navegação via teclado (tabindex, focus, aria-labels).
- Modais com focus trap e retorno de foco após fechamento.
- Testes de acessibilidade com **axe-core** e **Lighthouse**.

**Animações e Motion**

- Usar **Framer Motion** para microinterações leves.
- Respeitar preferências do usuário (`prefers-reduced-motion`).
- Evitar bloqueios de interação e layout shifts (CLS).
- Animações rápidas, fluidas e sutis (efeito premium, não exagerado).

**Performance e Bundle**

- Medir bundle size com `@next/bundle-analyzer`.
- **Dynamic Import** para componentes pesados (charts, tabelas, editores).
- Imagens otimizadas com `<Image />` e formatos modernos (WebP, AVIF).
- Fonts com `next/font` e `font-display: swap`.
- Evitar `@apply` excessivo; priorizar classes utilitárias.

**Segurança no Frontend**

- Nunca expor chaves ou tokens no client (`NEXT_PUBLIC_` apenas para dados públicos).
- CSP rigorosa (sem inline scripts não verificados).
- Sanitizar HTML dinâmico (DOMPurify).
- Cookies seguros (`HttpOnly`, `Secure`, `SameSite`).
- Validar tokens e dados sensíveis apenas server-side.

**PWA e Mobile Experience**

- Manifest e Service Worker configurados para comportamento **app-like**.
- Cache apenas de assets estáticos — **nunca dados financeiros**.
- Touch targets ≥ 44px e gestos otimizados para mobile.
- Splash screens e ícones adaptados.

**Gráficos e Dados**

- **react-virtual** para listas grandes.
- Paginação e filtros server-side.
- Export de relatórios (CSV/XLSX) processado no backend.
- Visualizações leves (Recharts/ECharts) com lazy loading.

**Testes e Qualidade**

- **Jest + Testing Library** para unit tests.
- **Playwright** para testes E2E (flows críticos).
- **axe-core** para auditorias de acessibilidade.
- **Storybook** para documentação visual de componentes.
- CI com gates de lint, typecheck e testes obrigatórios.

**Lint, Build e Padronização**

- ESLint (React, TypeScript, Tailwind, Accessibility).
- Prettier com formatação padronizada.
- `pnpm` para scripts e dependências.
- Husky + lint-staged para hooks pré-commit.
- Build e deploy bloqueados se qualquer gate falhar.

**Observabilidade**

- Integração com **Sentry/OpenTelemetry** (traceId em todas requests).
- Monitorar métricas de UI, erros e tempo de renderização.
- Respeitar LGPD (opt-in de tracking e anonimização de dados).

**Nunca Faça**

- Nunca usar `any`, `var` ou `default exports`.
- Nunca deixar lógica de negócio no frontend.
- Nunca usar bibliotecas não revisadas de segurança.
- Nunca usar inline scripts ou eval.
- Nunca expor informações financeiras no client.

**Padrões Gerais**

- Funções pequenas com **early return**.
- Evitar duplicidade: extrair lógica repetida para hooks/helpers.
- Usar `const` sempre que possível.
- Nome de funções deve ser verbo (`handleSubmit`, `fetchData`, `renderChart`).
- Imports ordenados e consistentes.
- Nomear variáveis de forma clara e sem abreviações obscuras.
