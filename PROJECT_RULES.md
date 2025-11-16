# 📋 Turbofy - Regras Detalhadas do Projeto

## 🎯 Propósito
Este documento define as regras, padrões e convenções que todos os agentes (Cursor, Trae, etc.) devem seguir ao trabalhar no projeto Turbofy.

## 🏢 Sobre o Projeto

**Nome**: Turbofy  
**Tipo**: Gateway de Pagamentos (Payment Gateway)  
**Modelo**: SaaS (Software as a Service)

### Funcionalidades Core

#### Para Proprietários (Dashboard Admin)
- 📊 Visualização de lucro e receitas em tempo real
- 📈 Relatórios financeiros detalhados
- 💰 Análise de taxas e comissões
- 🔄 Conciliação bancária automática
- 💸 Controle de split de pagamentos
- 👥 Gestão de clientes e transações

#### Para Clientes (Dashboard Cliente)
- 💳 Criação de cobranças (Pix, Boleto)
- 📋 Relatórios e extratos financeiros
- 🔑 Gerenciamento de chaves Pix
- 📄 Gerenciamento de boletos
- 💵 Acompanhamento de taxas aplicadas
- 📊 Dashboard personalizado

## 🏗️ Arquitetura

### Arquitetura Hexagonal (Ports & Adapters)

A arquitetura hexagonal separa a lógica de negócio das implementações técnicas:

```
┌─────────────────────────────────────┐
│         Application Layer           │
│  (Use Cases, Services, DTOs)        │
└─────────────────────────────────────┘
           ↕ (Ports/Interfaces)
┌─────────────────────────────────────┐
│          Domain Layer               │
│  (Entities, Value Objects, Rules)   │
└─────────────────────────────────────┘
           ↕ (Ports/Interfaces)
┌─────────────────────────────────────┐
│      Infrastructure Layer           │
│  (DB, APIs, RabbitMQ, HTTP)         │
└─────────────────────────────────────┘
```

#### Regras de Dependência
- ✅ Domain NÃO depende de nada (camada mais interna)
- ✅ Application depende apenas de Domain
- ✅ Infrastructure depende de Application e Domain
- ❌ Domain NUNCA importa de Infrastructure
- ❌ Application NUNCA importa de Infrastructure diretamente

### Estrutura de Pastas Detalhada

#### Backend (`backend/src/`)

```
domain/
├── entities/
│   ├── Payment.ts              # Entidade Payment
│   ├── User.ts                 # Entidade User
│   ├── Charge.ts               # Entidade Charge
│   └── Split.ts                # Entidade Split
├── value-objects/
│   ├── Money.ts                # Value object para valores monetários
│   ├── PixKey.ts               # Value object para chave Pix
│   └── Document.ts             # Value object para CPF/CNPJ
├── repositories/
│   ├── IPaymentRepository.ts   # Interface (port)
│   ├── IUserRepository.ts
│   └── IChargeRepository.ts
└── services/
    └── IPaymentGateway.ts      # Interface para gateway externo

application/
├── use-cases/
│   ├── payments/
│   │   ├── CreatePaymentUseCase.ts
│   │   ├── ProcessPaymentUseCase.ts
│   │   └── RefundPaymentUseCase.ts
│   ├── charges/
│   │   ├── CreateChargeUseCase.ts
│   │   └── ListChargesUseCase.ts
│   └── splits/
│       └── ExecuteSplitUseCase.ts
├── services/
│   ├── PaymentService.ts
│   ├── ReconciliationService.ts
│   └── SplitService.ts
└── dto/
    ├── CreatePaymentDTO.ts
    ├── PaymentResponseDTO.ts
    └── ChargeRequestDTO.ts

infrastructure/
├── database/
│   ├── prisma/
│   │   └── PrismaPaymentRepository.ts  # Implementação
│   └── migrations/
├── messaging/
│   ├── RabbitMQClient.ts
│   └── PaymentEventPublisher.ts
├── external/
│   ├── banks/
│   │   └── BankAPIClient.ts
│   └── payment-gateways/
│       └── PaymentGatewayAdapter.ts
└── http/
    ├── routes/
    │   ├── payments.routes.ts
    │   └── charges.routes.ts
    ├── controllers/
    │   ├── PaymentController.ts
    │   └── ChargeController.ts
    └── middlewares/
        ├── auth.middleware.ts
        └── validation.middleware.ts
```

## 🔒 Type Safety - Regras Estritas

### Proibição de `any`

**REGRA ABSOLUTA**: NUNCA usar `any` no código.

#### Alternativas ao `any`:

1. **`unknown`**: Quando o tipo é verdadeiramente desconhecido
```typescript
// ✅ CORRETO
function processUnknown(data: unknown): void {
  if (typeof data === 'string') {
    // TypeScript sabe que é string aqui
  }
}

// ❌ ERRADO
function processUnknown(data: any): void {
  // TypeScript não ajuda aqui
}
```

2. **Tipos específicos**: Sempre definir tipos
```typescript
// ✅ CORRETO
interface PaymentData {
  amount: number;
  currency: string;
  description: string;
}

function processPayment(data: PaymentData): void {
  // ...
}

// ❌ ERRADO
function processPayment(data: any): void {
  // ...
}
```

3. **Generics**: Para reutilização type-safe
```typescript
// ✅ CORRETO
function process<T extends PaymentData>(data: T): T {
  // ...
}

// ❌ ERRADO
function process(data: any): any {
  // ...
}
```

### Validação com Zod

Sempre validar dados de entrada com Zod:

```typescript
import { z } from 'zod';

const PaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().min(1).max(255),
});

type PaymentRequest = z.infer<typeof PaymentSchema>;

function createPayment(data: unknown): PaymentRequest {
  return PaymentSchema.parse(data); // Valida e retorna tipo seguro
}
```

## 📝 Convenções de Código

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Classes | PascalCase | `PaymentService`, `UserRepository` |
| Interfaces | PascalCase (prefixo `I` opcional) | `IPayment`, `PaymentRequest` |
| Types | PascalCase | `PaymentStatus`, `UserRole` |
| Funções/Métodos | camelCase | `createPayment()`, `processRefund()` |
| Variáveis | camelCase | `paymentAmount`, `userEmail` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT` |
| Arquivos | kebab-case | `payment-service.ts`, `user-repository.ts` |
| Diretórios | kebab-case | `payment-services/`, `user-repositories/` |

### Estrutura de Classes

```typescript
// ✅ CORRETO
export class PaymentService {
  // 1. Propriedades privadas
  private readonly repository: IPaymentRepository;
  
  // 2. Construtor
  constructor(repository: IPaymentRepository) {
    this.repository = repository;
  }
  
  // 3. Métodos públicos
  public async createPayment(data: CreatePaymentDTO): Promise<Payment> {
    // ...
  }
  
  // 4. Métodos privados
  private validatePayment(data: CreatePaymentDTO): void {
    // ...
  }
}
```

### Tratamento de Erros

```typescript
// ✅ CORRETO - Erros customizados
export class PaymentNotFoundError extends Error {
  constructor(public readonly paymentId: string) {
    super(`Payment ${paymentId} not found`);
    this.name = 'PaymentNotFoundError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(public readonly required: number, public readonly available: number) {
    super(`Insufficient funds. Required: ${required}, Available: ${available}`);
    this.name = 'InsufficientFundsError';
  }
}

// Uso
try {
  await paymentService.processPayment(data);
} catch (error) {
  if (error instanceof PaymentNotFoundError) {
    // Tratamento específico
  } else if (error instanceof InsufficientFundsError) {
    // Tratamento específico
  } else {
    // Erro genérico
    logger.error('Unexpected error', error);
  }
}
```

## 🗄️ Banco de Dados (Prisma)

### Schema Patterns

```prisma
// ✅ CORRETO - Schema bem estruturado
model Payment {
  id            String   @id @default(uuid())
  amount        Decimal  @db.Decimal(10, 2)
  currency      String   @default("BRL")
  status        PaymentStatus
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relações
  charge        Charge?  @relation(fields: [chargeId], references: [id])
  chargeId      String?
  
  splits        Split[]
  
  // Indexes
  @@index([status])
  @@index([createdAt])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}
```

### Repository Pattern

```typescript
// Port (Interface)
export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByChargeId(chargeId: string): Promise<Payment[]>;
  save(payment: Payment): Promise<Payment>;
  update(id: string, data: Partial<Payment>): Promise<Payment>;
}

// Adapter (Implementação)
export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}
  
  async findById(id: string): Promise<Payment | null> {
    const data = await this.prisma.payment.findUnique({
      where: { id },
      include: { splits: true },
    });
    
    return data ? this.toDomain(data) : null;
  }
  
  private toDomain(data: PrismaPayment): Payment {
    return Payment.create({
      id: data.id,
      amount: data.amount,
      // ...
    });
  }
}
```

## 🔄 Mensageria (RabbitMQ)

### Padrão de Eventos

```typescript
// ✅ CORRETO - Eventos tipados
export interface PaymentCreatedEvent {
  type: 'payment.created';
  paymentId: string;
  amount: number;
  currency: string;
  timestamp: Date;
}

export interface PaymentProcessedEvent {
  type: 'payment.processed';
  paymentId: string;
  status: 'completed' | 'failed';
  timestamp: Date;
}

// Publisher
export class PaymentEventPublisher {
  constructor(private readonly rabbitmq: RabbitMQClient) {}
  
  async publishPaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    await this.rabbitmq.publish('payments', 'payment.created', event);
  }
}

// Consumer
export class PaymentEventConsumer {
  async consumePaymentCreated(
    handler: (event: PaymentCreatedEvent) => Promise<void>
  ): Promise<void> {
    await this.rabbitmq.consume('payments', 'payment.created', handler);
  }
}
```

## 🎨 Frontend (React/Next.js)

### Componentes

```typescript
// ✅ CORRETO - Componente tipado
interface PaymentCardProps {
  payment: Payment;
  onViewDetails?: (id: string) => void;
}

export function PaymentCard({ payment, onViewDetails }: PaymentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{payment.description}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Amount: {formatCurrency(payment.amount)}</p>
        <p>Status: {payment.status}</p>
      </CardContent>
      {onViewDetails && (
        <CardFooter>
          <Button onClick={() => onViewDetails(payment.id)}>
            View Details
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
```

### Hooks Customizados

```typescript
// ✅ CORRETO - Hook tipado
export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.list();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { payments, loading, error, fetchPayments };
}
```

## 🧪 Testes

### Estrutura de Testes

```typescript
// ✅ CORRETO - Teste bem estruturado
describe('PaymentService', () => {
  let service: PaymentService;
  let mockRepository: jest.Mocked<IPaymentRepository>;
  
  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      // ...
    } as jest.Mocked<IPaymentRepository>;
    
    service = new PaymentService(mockRepository);
  });
  
  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      // Arrange
      const dto: CreatePaymentDTO = {
        amount: 100,
        currency: 'BRL',
        description: 'Test payment',
      };
      
      const expectedPayment = Payment.create(dto);
      mockRepository.save.mockResolvedValue(expectedPayment);
      
      // Act
      const result = await service.createPayment(dto);
      
      // Assert
      expect(result).toEqual(expectedPayment);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
    
    it('should throw error for invalid amount', async () => {
      // Arrange
      const dto: CreatePaymentDTO = {
        amount: -100, // Invalid
        currency: 'BRL',
        description: 'Test payment',
      };
      
      // Act & Assert
      await expect(service.createPayment(dto)).rejects.toThrow(
        'Amount must be positive'
      );
    });
  });
});
```

## 🚀 Deploy (SST)

### Configuração de Stacks

```typescript
// ✅ CORRETO - Stack bem configurado
export function DatabaseStack({ stack }: StackContext) {
  const database = new RDS(stack, "Database", {
    engine: "postgresql11.13",
    defaultDatabaseName: "turbofy",
  });
  
  return {
    databaseUrl: database.connectionString,
  };
}

export function ApiStack({ stack }: StackContext) {
  const { databaseUrl } = use(DatabaseStack);
  
  const api = new Api(stack, "Api", {
    routes: {
      "POST /payments": "backend/src/http/routes/payments.routes.create",
      "GET /payments": "backend/src/http/routes/payments.routes.list",
    },
    environment: {
      DATABASE_URL: databaseUrl,
    },
  });
  
  return {
    apiUrl: api.url,
  };
}
```

## ⚠️ Checklist de Qualidade

Antes de commitar código, verificar:

- [ ] ✅ Nenhum uso de `any`
- [ ] ✅ Todos os inputs validados com Zod
- [ ] ✅ Erros tratados adequadamente
- [ ] ✅ Tipos explícitos em todas as funções
- [ ] ✅ Arquitetura hexagonal respeitada
- [ ] ✅ Princípios SOLID aplicados
- [ ] ✅ Código limpo e legível
- [ ] ✅ Testes para lógica crítica
- [ ] ✅ Logs estruturados
- [ ] ✅ Sem secrets no código
- [ ] ✅ Documentação de decisões complexas

## 📚 Documentação Complementar

- `README.md` – Visão geral do monorepo.
- `AGENTS.md` + `AGENT_PLAYBOOK.md` – Contrato do agente e playbook operacional.
- `PROJECT_COMMANDS.md` / `USER_COMMANDS.md` – Comandos técnicos e fluxo diário.
- `backend/docs/charges.md` – Domínio de cobranças.
- `backend/docs/checkout.md` – Fluxo end-to-end do checkout white-label.
- `backend/docs/payment-providers.md` – Estratégia de provedores (Transfeera, BSPay, Stub).
- `backend/docs/financial-flow.md` – Relação entre cobranças, splits, settlements e reconciliação.
- `frontend/PROJECT_RULES.md` – Diretrizes específicas do frontend.

## 📚 Referências

- [Arquitetura Hexagonal - Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [SST Documentation](https://docs.sst.dev)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**Última atualização**: 2024  
**Versão**: 1.0.0

