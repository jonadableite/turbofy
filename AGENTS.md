# AGENTS.md – Turbofy Gateway Code Agent

Documento-resumo do papel do agente. Detalhes operacionais estão no `AGENT_PLAYBOOK.md` e nas regras oficiais listadas abaixo.

---

## 1. Papel
- Ser extensão inteligente do time Turbofy.
- Evoluir o gateway de pagamentos mantendo segurança, escalabilidade e consistência.
- Responder exclusivamente em **Português**, sempre com referências ao código/documentos.

---

## 2. Contrato Essencial
- Usar ferramentas (`codebase_search`, `read_file`, etc.) antes de concluir qualquer hipótese.
- Nunca usar `any`, `var` ou atalhos que fujam do TypeScript `strict`.
- Preservar Arquitetura Hexagonal, SOLID, Clean Code e validações com Zod.
- Priorizar evidências: cite caminhos de arquivos e testes executados.
- Manter documentação sincronizada com o comportamento do código.

---

## 3. Fontes Oficiais
| Documento | Conteúdo |
| --- | --- |
| `PROJECT_RULES.md` | Regras de engenharia, arquitetura e padrões de código. |
| `PROJECT_COMMANDS.md` / `USER_COMMANDS.md` | Comandos técnicos e fluxo diário. |
| `backend/docs/charges.md` | Domínio de cobranças. |
| `backend/docs/financial-flow.md` | Fluxo financeiro completo (cobranças, splits, settlements, reconciliações). |
| `backend/docs/checkout.md` | Fluxo end-to-end do checkout e white-label sessions. |
| `backend/docs/payment-providers.md` | Estratégia de providers (Transfeera, BSPay, Stub). |
| `frontend/README.md` + `frontend/PROJECT_RULES.md` | Guia de setup, convenções de UI/UX e design system. |
| `AGENT_PLAYBOOK.md` | Passo a passo operacional, checklist e template de resposta. |
| `.cursorrules` | Regras automatizadas carregadas pelo Cursor (não alterar). |

Sempre consulte esses arquivos antes de editar código.

---

## 4. Workflow Operacional
1. **Health Check** – Lints, testes rápidos, `curl /healthz` se necessário.
2. **Descoberta guiada por evidências** – buscas semânticas, leitura de código e docs.
3. **Planejamento com TODO** – liste etapas em `todo_write`, atualize conforme progride.
4. **Execução** – respeite Domain → Application → Ports → Infrastructure, mantenha idempotência e logs estruturados.
5. **Validação** – testes (`pnpm --filter ...`), `read_lints`, checar Swagger/documentação se endpoint mudou.
6. **Encerramento** – documente decisões relevantes, use o template do `AGENT_PLAYBOOK.md` na resposta final.

> Detalhes e comandos sugeridos estão no `AGENT_PLAYBOOK.md`.

---

## 5. Diretrizes Técnicas Express
- **Domain** não importa nada externo. **Application** fala só com Domain + Ports. **Infrastructure** implementa ports e expõe HTTP/messaging.
- Toda entrada externa passa por schema Zod antes de atingir Application. Camadas internas validam regras de negócio novamente.
- Logs devem conter `traceId`/`idempotencyKey` quando disponíveis.
- Eventos publicados seguem contratos tipados (ver `backend/src/ports/MessagingPort.ts`).
- No frontend, priorize Server Components; Client Components apenas quando há interatividade.

---

## 6. Observabilidade, Segurança e QA
- `backend/src/index.ts` já aplica Helmet, CORS restrito, rate limit e `/metrics`. Preserve e amplie quando necessário.
- Variáveis de ambiente são validadas em `backend/src/config/env.ts`. Nunca bypassar o schema.
- Mensageria usa routing keys `turbofy.*` e precisa de idempotência por `idempotencyKey`.
- Testes: mínimo 80% em fluxos críticos; reorganize ou adicione quando tocar regras de negócio.
- Sempre atualize Swagger/OpenAPI e documentação em `backend/docs` quando novos endpoints ou mudanças de payload ocorrerem.

---

## 7. Como Pedir Ajuda
- Precisa de contexto adicional? Primeiro consulte os arquivos listados em **Fontes Oficiais**.
- Persistem dúvidas? Documente no TODO ou abra questão no comentário final com perguntas objetivas (sinalize bloqueios).

---

Com este contrato + `AGENT_PLAYBOOK.md`, qualquer agente consegue operar o Turbofy com previsibilidade e qualidade. Mantenha o documento atualizado sempre que novas regras globais forem introduzidas.

