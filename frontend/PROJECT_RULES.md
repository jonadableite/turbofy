# Turbofy Frontend – Regras e Padrões

Guia oficial para construir o dashboard SaaS e o checkout público mantendo consistência, acessibilidade e performance.

---

## 1. Princípios
- **Type-safe sempre**: sem `any`/`var`; use interfaces e generics.
- **Server Components por padrão**; Client Components apenas para interatividade (forms, animações, estados locais).
- **Arquitetura modular**: componentes atômicos em `src/components`, features segmentadas em `app/(area)/`.
- **Mobile-first** e estética premium/cybersecurity.
- **Clean Code**: nomes descritivos, funções curtas, early return, DRY.

---

## 2. Stack e Convenções
- Next.js App Router (layouts, loading, error, route groups).
- TailwindCSS v4 com tokens centralizados em `tailwind.config.ts`.
- shadcn/ui como base; personalize via `src/ui/`.
- Tipar dados externos com Zod (`src/lib/schemas` quando aplicável).
- Hooks customizados prefixados por `use`.

---

## 3. Design System
- **Cores** em OKLCH; mantenha contraste ≥ 4.5:1.
- **Tipografia**: use fontes configuradas em `layout.tsx`; declare variantes via CSS vars.
- **Espaçamento**: múltiplos de 4px; padronize em Tailwind (p-4, gap-6, etc.).
- **Componentes**:
  - Botões/inputs: shadcn/ui + variantes definidas com CVA.
  - Cartões, tabelas e painéis: extraia para `components/ui` para reuso.
- **Dark mode** obrigatório; use `next-themes` + classes `dark:` do Tailwind.

---

## 4. Experiência do Checkout
- `PaymentSelector` e componentes relacionados devem:
  - Utilizar animações leves com Framer Motion.
  - Exibir timers de expiração e estados de carregamento/idempotência.
  - Seguir os contratos documentados em `backend/docs/checkout.md`.
- Reaproveite estilos premium (gradientes, glassmorphism) definidos em tokens globais.

---

## 5. Estado e Dados
- Server Components para data fetching sempre que possível (`fetch`/`cache`/`revalidate`).
- Client state com `useState`/`useReducer`; use Context somente para dados realmente globais (ex.: auth).
- Formulários: `react-hook-form` + Zod resolver; mensagens claras por campo.
- SWR/React Query apenas para dados altamente interativos; justificar uso.

---

## 6. Acessibilidade (WCAG 2.1 AA)
- Labels e `aria-*` em todos os inputs.
- Foco visível personalizado e navegação via teclado.
- Evite texto em imagens; descreva com `alt`.
- Componentes interativos precisam de `role` e `aria-live` quando necessário.

---

## 7. Motion e Performance
- Framer Motion para microinterações; respeite `prefers-reduced-motion`.
- Evite blocos com `layout-shift`; use `motion.div` com `layout` quando necessário.
- Lazy load para gráficos/tabelas pesadas (`dynamic(() => import(...), { ssr: false })`).
- Monitore bundle com `@next/bundle-analyzer` ao introduzir libs novas.

---

## 8. Segurança
- Nunca expor segredos; utilize apenas envs `NEXT_PUBLIC_*` para dados realmente públicos.
- Cookies JWT devem ser `HttpOnly` e gerenciados pelo backend.
- Escape/sanitizar qualquer HTML dinâmico (ex.: relatórios) com DOMPurify.

---

## 9. Checklist por PR
- [ ] Sem `any`/`var`, tipo explícito em props e retornos.
- [ ] Componentes acessíveis (labels, foco, contraste).
- [ ] Responsividade validada em breakpoints principais (sm/md/lg).
- [ ] Lint (`pnpm --filter frontend lint`) e type-check executados.
- [ ] Testes relevantes adicionados/atualizados (Vitest ou Playwright).
- [ ] Documentação atualizada (`frontend/README.md`, notas de design se necessário).

Mantenha este arquivo atualizado sempre que novas decisões de UI/UX ou engenharia forem tomadas.