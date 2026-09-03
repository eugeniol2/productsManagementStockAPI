# Controle de estoque para mercearia

API de controle de estoque para uma mercearia de bairro, com rastreio por **fardo**: cada compra entra com sua própria validade e seu próprio custo, e o saldo do produto é a soma dos fardos — nunca uma coluna `quantidade`. Isso responde as duas perguntas que decidem se a loja ganha ou perde dinheiro: *o que vence primeiro* e *quanto foi pago em cada compra*.

Este repositório é a **API núcleo** de um sistema maior, desenhado como microsserviços: a autenticação é um serviço à parte, que emite os tokens JWT que o núcleo verifica; cada cliente — a web de gestão e o mobile de balcão — conversa com o núcleo por um BFF próprio, em seu próprio repositório. Aqui vive o serviço de domínio; os demais são peças do mesmo desenho, e as fronteiras entre elas já valem neste código — banco não compartilhado, `accountId` sempre vindo do token, erro como código e não como frase.

Projeto de estudo, escrito como código de produção.

## Destaques de design

- **A prateleira é a verdade, não o banco.** O sistema nunca recusa uma venda por divergência de saldo: vender além do estoque gera saldo negativo e registra o `shortfall`. Quem reconcilia é o ajuste de inventário.
- **Multi-tenant num banco só.** Cada loja é uma conta; o `accountId` vem sempre do token e escopa toda leitura e escrita. Recurso de outra conta responde `404` — não existe para você.
- **Toda rota exige um token assinado (JWT RS256).** O núcleo verifica o token com a chave pública e confia no `accountId` e no operador que vêm dele, nunca do corpo ou da URL.
- **Baixa pelo fardo de validade mais próxima (FEFO)** — como convenção assumida, já que o código de barras identifica o modelo do produto, não a unidade física.
- **Venda transacional com bloqueio de linha** (`SELECT ... FOR UPDATE`), para que duas vendas simultâneas do último item não furem o estoque.
- **Venda idempotente:** o cliente envia um UUID por venda e o servidor recusa o reenvio, essencial para um mobile com internet instável.
- **Movimentação é livro-razão:** entrada, venda, ajuste e perda são lançamentos que só crescem; qualquer saldo é reconstruível a partir do zero.
- **Código de barras desconhecido vira aprendizado, não catálogo.** Um bipe que não bate é resolvido na mão e registrado como observação; a reincidência separa erro de leitura de embalagem nova, e o dono decide o que promover ao produto.
- **Validação no limite do domínio:** entrada malformada vira `400` com código de erro e nunca chega ao banco. O detalhe do erro vai para o log, não para o cliente.

O raciocínio completo por trás de cada decisão está em [JOURNAL.md](JOURNAL.md); as regras de código do projeto, em [ENGINEERING.md](ENGINEERING.md).

## Stack

Node 24 executando TypeScript sem etapa de build · Express 5 · Zod na validação · Prisma 7 sobre PostgreSQL 17 · jose nos tokens JWT · Vitest nos testes.

## Rotas

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/categories` | Lista as categorias |
| `GET` | `/products` | Catálogo; aceita `?categoryId=` |
| `GET` | `/products/:id` | Produto pelo id interno |
| `GET` | `/products/code/:code` | Produto por código interno ou de barras |
| `PUT` | `/products/:id/price` | Altera o preço de venda por unidade |
| `POST` | `/stock-entries` | Entrada de mercadoria (nota com vários fardos) |
| `POST` | `/sales` | Registra uma venda (carrinho transacional) |
| `POST` | `/products/:id/barcodes` | Vincula um código de barras ao produto |
| `GET` | `/barcode-observations` | Fila de códigos desconhecidos, para o dono revisar |
| `POST` | `/barcode-observations` | Registra um bipe desconhecido resolvido na mão |
| `DELETE` | `/barcode-observations/:id` | Descarta uma observação |

Toda rota exige um JWT assinado no cabeçalho `Authorization: Bearer`. Cada rota — o caminho de sucesso e cada forma de recusa — é exercitada pelos testes automatizados (ver [Testes](#testes)).

## Como rodar

Requer Node 24+ e Docker.

```bash
npm install
cp .env.example .env          # ajuste POSTGRES_PASSWORD e DATABASE_URL
docker compose up -d          # sobe o PostgreSQL
npx prisma migrate dev        # aplica o schema, gera o client e popula o seed
npm run dev                   # sobe a API em http://localhost:3000
```

O seed popula o banco com dados determinísticos: 11 categorias e 50 produtos com fardos, códigos de barras e movimentações, todos sob uma conta demo.

As rotas exigem um JWT assinado (RS256), verificado com a `JWT_PUBLIC_KEY` do `.env`. O serviço que emite os tokens é peça futura — hoje quem exercita as rotas de ponta a ponta são os testes de integração, que geram um par de chaves em memória.

## Testes

```bash
npm test                 # suíte pura (FEFO e schemas), sem banco — roda a cada commit
npm run test:integration # contra um Postgres descartável, provisionado automaticamente
npm run typecheck        # verificação de tipos
```

A suíte pura cobre a alocação FEFO e a validação de entrada. A de integração cobre a autenticação, o isolamento entre contas, a entrada de mercadoria e o aprendizado de códigos de barras — contra um banco `stock_test` que ela mesma cria e migra (precisa do Postgres no ar). A venda e a concorrência ainda não têm cobertura; o plano está no [JOURNAL.md](JOURNAL.md#testes-de-integração).
