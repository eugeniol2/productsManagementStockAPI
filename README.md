# Controle de estoque para mercearia

API de controle de estoque para uma mercearia de bairro, com rastreio por **fardo**: cada compra entra com sua própria validade e seu próprio custo, e o saldo do produto é a soma dos fardos — nunca uma coluna `quantidade`. Isso responde as duas perguntas que decidem se a loja ganha ou perde dinheiro: *o que vence primeiro* e *quanto foi pago em cada compra*.

Projeto de estudo, escrito como código de produção.

## Destaques de design

- **A prateleira é a verdade, não o banco.** O sistema nunca recusa uma venda por divergência de saldo: vender além do estoque gera saldo negativo e registra o `shortfall`. Quem reconcilia é o ajuste de inventário.
- **Baixa pelo fardo de validade mais próxima (FEFO)** — como convenção assumida, já que o código de barras identifica o modelo do produto, não a unidade física.
- **Venda transacional com bloqueio de linha** (`SELECT ... FOR UPDATE`), para que duas vendas simultâneas do último item não furem o estoque.
- **Venda idempotente:** o cliente envia um UUID por venda e o servidor recusa o reenvio, essencial para um mobile com internet instável.
- **Movimentação é livro-razão:** entrada, venda, ajuste e perda são lançamentos que só crescem; qualquer saldo é reconstruível a partir do zero.
- **Validação no limite do domínio:** entrada malformada vira `400` com código de erro e nunca chega ao banco. O detalhe do erro vai para o log, não para o cliente.

O raciocínio completo por trás de cada decisão está em [JOURNAL.md](JOURNAL.md); as regras de código do projeto, em [ENGINEERING.md](ENGINEERING.md).

## Stack

Node 24 executando TypeScript sem etapa de build · Express 5 · Zod na validação · Prisma 7 sobre PostgreSQL 17 · Vitest nos testes.

## Rotas

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/categories` | Lista as categorias |
| `GET` | `/products` | Catálogo; aceita `?categoryId=` |
| `GET` | `/products/:id` | Produto pelo id interno |
| `GET` | `/products/code/:code` | Produto por código interno ou de barras |
| `POST` | `/sales` | Registra uma venda (carrinho transacional) |

Exemplos de requisição, incluindo os casos de erro, estão em [requests.http](requests.http).

## Como rodar

Requer Node 24+ e Docker.

```bash
npm install
cp .env.example .env          # ajuste POSTGRES_PASSWORD e DATABASE_URL
docker compose up -d          # sobe o PostgreSQL
npx prisma migrate dev        # aplica o schema, gera o client e popula o seed
npm run dev                   # sobe a API em http://localhost:3000
```

O seed popula o banco com dados determinísticos: 11 categorias e 50 produtos com fardos, códigos de barras e movimentações.

## Testes

```bash
npm test          # roda a suíte uma vez
npm run typecheck # verificação de tipos
```

Os testes cobrem a alocação FEFO e a validação de entrada. Cobertura de integração (rotas, transação, idempotência) é dívida conhecida e está registrada no [JOURNAL.md](JOURNAL.md#dívida-conhecida-testes-de-integração).
