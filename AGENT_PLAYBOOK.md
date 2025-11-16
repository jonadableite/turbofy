# 📘 Turbofy – Agent Playbook

Guia operacional rápido para qualquer agente (Cursor, Trae, GPT, etc.) entregar alterações consistentes no Turbofy Gateway.

---

## 1. Objetivo
- **Manter o gateway seguro, escalável e type-safe**.
- **Responder sempre em Português**, citando arquivos/trechos relevantes.
- **Nunca assumir**: confirme no código ou documentação.

---

## 2. Fluxo Operacional (Spec-Driven)
1. **Health Check**
   - `read_lints` nas áreas tocadas.
   - `curl http://localhost:3000/healthz` se API estiver rodando.
2. **Descoberta**
   - `codebase_search` ou `grep` para localizar casos de uso/rotas.
   - `read_file` para inspecionar entidades/ports/documentação.
3. **Planejamento**
   - Criar/atualizar TODO list (`todo_write`) descrevendo etapas principais.
   - Identificar arquivos a alterar e testes necessários.
4. **Execução**
   - Respeitar Arquitetura Hexagonal (Domain → Application → Ports → Infrastructure).
   - Validar inputs com Zod, manter type-safety (sem `any`).
   - Usar `apply_patch`/`write` para alterações; preferir constantes e early return.
5. **Validação**
   - `pnpm --filter backend test|build|type-check` ou equivalente no frontend.
   - `read_lints` após mudanças substanciais.
6. **Documentação e Resposta**
   - Atualizar README/MDs quando comportamento mudar.
   - Na resposta final: resumo curto, arquivos tocados, testes executados/pending, próximos passos.

---

## 3. Ferramentas Recomendadas
| Ação | Ferramenta |
| --- | --- |
| Buscar por conceito/comportamento | `codebase_search` |
| Encontrar string/símbolo exato | `grep` |
| Ler arquivo ou trecho específico | `read_file` |
| Rodar comandos (build/test/etc.) | `run_terminal_cmd` |
| Editar arquivos | `apply_patch`, `write`, `search_replace` |
| Acompanhar pendências | `todo_write` |

---

## 4. Checklist Antes de Finalizar
- [ ] Nenhum uso de `any` ou `var`.
- [ ] Inputs validados (Zod/DTOs) e erros tratados com classes específicas.
- [ ] Arquitetura Hexagonal preservada (sem dependências cruzadas).
- [ ] Atualizou documentação relevante (README, docs/, Swagger, etc.).
- [ ] Logs e eventos mantêm `traceId`/`idempotencyKey` quando aplicável.
- [ ] Testes e linters executados ou explicitamente justificados.
- [ ] Resposta final em Português, citando `\`caminhos\`` e resultados.

---

## 5. Template de Resposta Final
```
### Resumo
- (breve descrição das mudanças)

### Arquivos
- `caminho/arquivo.ts` – (motivo curto)

### Testes
- `pnpm --filter backend test` (✅/⚠️ + observações)

### Próximos Passos
- (se aplicável)
```

---

## 6. Fontes Oficiais
- `AGENTS.md` – Contrato do agente e missão.
- `PROJECT_RULES.md` – Regras de engenharia, SOLID e arquitetura.
- `PROJECT_COMMANDS.md` / `USER_COMMANDS.md` – Comandos de execução.
- `backend/docs/*.md` – Documentação de domínio (cobranças, fluxo financeiro, checkout, provedores).
- `frontend/PROJECT_RULES.md` – Guia de UI/UX e convenções do dashboard.

Siga este playbook em toda interação para garantir entregas coerentes e auditáveis.

