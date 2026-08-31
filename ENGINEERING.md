# Regras de Engenharia

Este documento define como todo código deve ser escrito neste projeto. Ele é obrigatório e tem precedência sobre preferências pessoais ou hábitos anteriores.

As seções marcadas com **Adotado neste projeto** registram decisões tomadas ao aplicar estas regras num caso concreto. Elas não afrouxam a regra: delimitam onde ela vale e explicam por quê.

---

## 0. Idioma

- **Código em inglês.** Identificadores, nomes de arquivo, diretórios, rotas, campos de JSON e mensagens de log.
- **Convenção de nomes:** `camelCase` em TypeScript. Quando o banco usar `snake_case`, o mapeamento é responsabilidade do ORM, não do código de domínio.
- **Dado de negócio permanece no idioma do negócio.** Nome de produto, razão social e texto vindo do usuário não são identificadores.
- **Erro de API devolve código, não frase.** `{"error": "PRODUCT_NOT_FOUND"}`, não `{"error": "Produto não encontrado"}`. A redação para humano é decisão de quem consome a API, tomada onde se sabe quem é o leitor.

---

## 1. Código sem comentários

**Regra: não escreva comentários.**

O código deve se explicar sozinho. Um comentário quase sempre é a admissão de que o código não ficou claro o bastante. Em vez de comentar, refatore.

**Em vez de comentar, faça isto:**

| Vontade de comentar | O que fazer |
|---|---|
| Explicar o que um bloco faz | Extraia o bloco para uma função com nome descritivo |
| Explicar o que uma variável guarda | Renomeie a variável |
| Explicar uma condição complexa | Extraia a condição para uma função ou variável booleana nomeada |
| Explicar um número ou string solta | Substitua por uma constante nomeada |
| Marcar seções dentro de uma função | A função é grande demais; quebre-a |
| Documentar uma decisão de arquitetura | Escreva no README, num ADR, ou na mensagem do commit |

**Proibido explicitamente:**

- Comentários que repetem o código (`// incrementa o contador`)
- Comentários de cabeçalho com autor, data ou histórico (isso é trabalho do Git)
- Código comentado — apague; o histórico do Git guarda o que foi removido
- Comentários desatualizados de qualquer tipo
- `// TODO` e `// FIXME` — abra uma issue no lugar

**Antes de entregar:** releia o diff e remova todo comentário que sobrou. Se um trecho parecer incompreensível sem comentário, o trecho está errado, não a regra.

> **Adotado neste projeto — arquivos de configuração.**
> Comentários são permitidos em `tsconfig.json`, `.vscode/settings.json`, `.gitignore`, `docker-compose.yml` e equivalentes.
> Motivo: a regra se sustenta porque existe uma alternativa melhor — extrair para função, renomear, criar constante. Em formato de configuração essa alternativa não existe: não há como um nome de chave explicar por que `erasableSyntaxOnly` está ligado. Sem o comentário, a informação simplesmente se perde.
> O limite continua valendo: o comentário explica **por que**, nunca **o que**.

---

## 2. Clean Code (Robert C. Martin)

### Nomes

- Nomes revelam intenção. `elapsedTimeInDays`, não `d`.
- Sem abreviações crípticas, sem notação húngara, sem prefixos de tipo.
- Nomes pronunciáveis e buscáveis. Nada de `genymdhms`.
- Classes são substantivos (`Customer`, `PaymentProcessor`). Métodos são verbos (`save`, `deletePage`, `isPosted`).
- Uma palavra por conceito em todo o projeto: escolha entre `fetch`, `get` e `retrieve` e use sempre a mesma.
- Evite palavras de ruído: `Data`, `Info`, `Manager`, `Processor` sem significado real.

### Funções

- **Pequenas.** Idealmente menos de 20 linhas.
- **Fazem uma coisa só**, num único nível de abstração.
- **Poucos argumentos.** Zero é ideal, três é o limite. Mais que isso, agrupe num objeto.
- **Sem argumentos booleanos** — um booleano prova que a função faz duas coisas. Crie duas funções.
- **Sem efeitos colaterais escondidos.** Se a função se chama `checkPassword`, ela não inicializa a sessão.
- **Comando ou consulta, nunca os dois.** Ou a função muda estado, ou retorna informação.
- **Prefira exceções a códigos de erro retornados.** Tratamento de erro é uma coisa: se a função trata erro, ela só faz isso.
- **Evite saída por parâmetro.** Retorne valores.

### Estrutura

O livro fala em classes. Em linguagens e projetos sem classes, a unidade equivalente é o **módulo** (arquivo), e as regras traduzem assim:

| Regra original | Equivalente sem classes |
|---|---|
| Uma classe, uma razão para mudar | Um módulo muda por um motivo só |
| Poucas variáveis de instância, alta coesão | Módulo pequeno, funções que operam sobre o mesmo conceito |
| Injete dependências, não instancie dentro | A função **recebe** o que precisa por parâmetro em vez de importar |
| Dependa de abstrações | Dependa de tipos de dado, não de implementações concretas |
| Público antes do privado | Exports antes dos auxiliares internos |

- Organize o arquivo de cima para baixo: o chamador antes do chamado.
- Aberto para extensão, fechado para modificação: adicione comportamento com novos módulos, não com novos `if`.

### Separação entre domínio e transporte

Regra de negócio não conhece a camada que a chamou.

- Um módulo de domínio **não importa** o framework web, não recebe `req`/`res`, não conhece código de status HTTP e não serializa resposta.
- Ele recebe dados e devolve dados.
- A camada de transporte (rota, handler, consumidor de fila) é a **tradutora**: converte a requisição em pergunta de domínio e o resultado em resposta do protocolo.

**Teste objetivo:** se para testar uma regra é preciso subir um servidor ou fabricar um objeto de requisição, o corte está no lugar errado.

### Formatação e organização

- Uma linha vertical em branco separa conceitos; linhas relacionadas ficam juntas.
- Linhas curtas. Nada de rolagem horizontal.
- Indentação e estilo consistentes em todo o projeto — garantidos por formatador automático, não por revisão manual.
- Sem código morto: nada de funções não usadas, imports não usados ou branches inalcançáveis.

### Tratamento de erros

- Nunca retorne `null`; nunca passe `null` como argumento. Use tipos opcionais, coleções vazias ou o Null Object.
- Exceções carregam contexto suficiente para diagnosticar o problema.
- Não engula exceções em blocos `catch` vazios.

> **Adotado neste projeto — consulta vazia não é exceção.**
> As regras "prefira exceções a códigos de erro" e "use tipos opcionais" apontam para lados diferentes numa busca que não encontra nada. A divisão adotada:
>
> - **Consulta que não encontra → tipo opcional.** `findByCode(...): Product | undefined`. Não encontrar é resultado normal de uma busca, não falha do sistema. Com checagem estrita de tipos o compilador **obriga** o chamador a tratar o caso, então o risco que motiva a regra da exceção não existe.
> - **Operação que não pode ser concluída → exceção.** Vender mais unidades do que existem não é resultado vazio: é regra de negócio violada. A exceção carrega contexto suficiente para diagnosticar.
>
> A diferença: no primeiro caso o sistema respondeu à pergunta; no segundo, recusou-se a fazer o que foi pedido.

> **Adotado neste projeto — `null` em campo de dado.**
> A proibição vale para **retorno e argumento**. Um campo que modela ausência real no negócio pode ser nulo: `barcode: string | null` diz que o produto não tem código de barras, o que é fato, não erro. As alternativas — string vazia ou Null Object — mentem sobre a realidade ou inventam estrutura sem ganho.

### Testes

- Todo comportamento novo vem com teste.
- Testes seguem F.I.R.S.T.: rápidos, independentes, repetíveis, auto-validáveis, escritos junto com o código.
- Um conceito por teste; idealmente uma asserção.
- Código de teste é código de produção: mesma exigência de clareza e limpeza.
- Teste de regra de domínio não sobe servidor nem banco. Se subir, revise a separação entre domínio e transporte.
- O teste monta os próprios dados. Não importe fixtures da aplicação: o caso de teste escolhe o cenário que quer exercitar.

### Regras gerais

- **Boy Scout Rule:** deixe o código mais limpo do que encontrou.
- **DRY:** duplicação é o inimigo. Extraia.
- **YAGNI:** não implemente o que ninguém pediu. Caso de borda não decidido é decisão pendente, não bug — registre e siga.
- Prefira a solução mais simples que funcione.

---

## 3. The Twelve-Factor App

Aplique as doze regras de https://12factor.net sempre que forem aplicáveis ao contexto.

**I. Base de código** — Uma base de código rastreada em controle de versão, muitos deploys. Nada de código fora do repositório.

**II. Dependências** — Declare todas as dependências explicitamente num manifesto e isole-as. Nunca dependa de pacotes instalados na máquina do sistema. Fixe versões.

**III. Configurações** — Configuração vive em variáveis de ambiente, nunca no código. Teste: o repositório poderia virar open source agora sem vazar credenciais? Nada de arquivos `config.dev`, `config.prod` versionados.

**IV. Serviços de apoio** — Banco de dados, fila, cache, SMTP e APIs externas são recursos anexados, acessados por URL/credencial vinda da configuração. Trocar um Postgres local por um gerenciado deve ser mudança de variável de ambiente, só.

**V. Build, release, run** — Três estágios estritamente separados. Releases são imutáveis e identificáveis. Nunca altere código em execução.

**VI. Processos** — Processos são stateless e não compartilham nada. Todo estado persistente vai para um serviço de apoio. Nada de sessão em memória ou arquivo em disco local como fonte de verdade.

**VII. Vínculo de portas** — A aplicação é autocontida e expõe seu serviço via porta. Não dependa de um servidor de aplicação injetado em tempo de execução.

**VIII. Concorrência** — Escale horizontalmente por processos. Divida o trabalho por tipo de processo (web, worker, agendador).

**IX. Descartabilidade** — Inicialização rápida e desligamento gracioso. Trate `SIGTERM`, termine o que está em andamento, devolva jobs à fila. O processo pode morrer a qualquer momento.

**X. Paridade dev/prod** — Mantenha desenvolvimento, homologação e produção o mais parecidos possível. Mesmos serviços de apoio, mesmas versões. Nada de SQLite em dev e Postgres em produção.

**XI. Logs** — Logs são fluxos de eventos escritos em `stdout`. A aplicação não gerencia arquivos de log nem faz rotação. Prefira formato estruturado.

**XII. Processos administrativos** — Tarefas de administração (migrações, scripts pontuais) rodam como processos únicos no mesmo ambiente e no mesmo código do release em execução.

> **Adotado neste projeto — fallback local de porta.**
> `Number(process.env.PORT ?? 3000)` mantém um padrão no código, o que o fator III não autoriza.
> Motivo: sem ele, rodar em desenvolvimento exige exportar variável a cada terminal novo. É desvio consciente e temporário — sai quando `.env` e contêiner existirem.
> O desvio vale **apenas** para valor não sensível. Credencial, string de conexão e segredo não têm padrão no código, em hipótese alguma.

---

## 4. Segurança

Baseado em <https://nodejs.org/learn/getting-started/security-best-practices>, filtrado para a superfície real deste projeto: uma API HTTP em Node/Express com Postgres, não publicada em registro público.

Cada item traz a ameaça e a mitigação concreta. É uma checklist a consultar durante o desenvolvimento; o que já foi feito e o que falta vive no histórico do Git e no `JOURNAL.md`, não aqui.

### Vale agora

**Negação de serviço no servidor HTTP (CWE-400).** Requisições lentas e deliberadamente fragmentadas seguram conexões abertas até esgotar o servidor. Não exige volume: um único cliente mal-intencionado basta.
*Mitigação:* configurar `headersTimeout`, `requestTimeout` e `keepAliveTimeout`; limitar o tamanho do corpo aceito pelo parser; proxy reverso à frente em produção.

**Entrada bem-formada que o banco não aceita (CWE-20).** Um número inteiro válido em JSON mas acima do `int4` do Postgres, ou um byte nulo num parâmetro de texto, passa pela validação de tipo e só estoura no banco, virando `500`. Além do status errado, a rota pode abrir transação e travar linhas antes de falhar.
*Mitigação:* validar no limite do domínio, não delegar ao banco. Todo identificador e toda contagem têm teto explícito; todo parâmetro de texto tem formato e comprimento validados antes de chegar ao Prisma.

**Divulgação de tecnologia.** O cabeçalho `x-powered-by` anuncia o framework em toda resposta, entregando de graça o alvo a quem procura falha conhecida.
*Mitigação:* `app.disable("x-powered-by")`.

**Módulos de terceiros maliciosos (CWE-1357).** Mantenedor comprometido, typosquatting, dependência confundida, script de pós-instalação exfiltrando dados.
*Mitigação:* versões exatas no manifesto, sem `^` nem `~`; lockfile versionado; `npm ci` em vez de `npm install` em automação; `npm audit` recorrente; conferir o nome antes de instalar.

**Poluição de protótipo (CWE-1321).** Corpo de requisição carregando `__proto__` ou `constructor` para alterar objetos base do JavaScript.
*Mitigação:* validar toda entrada externa com schema que descarte campos não declarados; nunca fazer merge recursivo de objeto vindo de fora.

**Exposição de informação sensível (CWE-552).** Resposta de erro vazando caminho de disco, pilha de execução ou detalhe interno.
*Mitigação:* cliente recebe código de erro; o detalhe vai para o log.

**Contrabando de requisição HTTP (CWE-444).** Proxy e servidor interpretando a mesma requisição ambígua de formas diferentes.
*Mitigação:* nunca habilitar `insecureHTTPParser`.

**Depurador exposto (CWE-346).** A porta do `--inspect` aceita conexão e é alvo de DNS rebinding.
*Mitigação:* nunca subir produção com `--inspect`.

### Vale quando chegar

**Ataque de temporização (CWE-208)** — na autenticação. Comparar token ou senha com `===` vaza informação pelo tempo de resposta, porque a comparação para no primeiro byte diferente. Usar `crypto.timingSafeEqual` e `crypto.scrypt`.

**Recursos experimentais em produção.** A documentação recomenda evitá-los. Este projeto executa TypeScript direto pelo Node, sem etapa de build. Antes do primeiro deploy, confirmar se esse mecanismo já é estável na versão em uso; se não for, compilar no build.

### Fora de escopo
`--secure-heap`, `--frozen-intrinsics` e o modelo de permissões do Node endereçam host compartilhado e código não confiável no mesmo processo. `npm publish` não se aplica: o pacote é `private`.

---

## 5. Como você deve responder

- Entregue código que já obedeça a estas regras. Não entregue uma versão "rápida" para corrigir depois.
- Se a solicitação conflitar com uma das regras, diga isso antes de escrever o código e proponha a alternativa que respeita as regras.
- Se o contexto exigir violar uma regra, explique o motivo na resposta em texto — nunca num comentário no código.
- Explicações, avisos e justificativas ficam sempre na conversa, fora dos arquivos.
- Ao editar código existente, siga estas regras no que você tocar e limpe o que estiver ao redor quando for barato fazer isso.
- Ao entregar, informe o resultado real da verificação — checagem de tipos, testes e execução. Sem verificação, diga que não verificou.
- Não afirme o que não pode comprovar. Suposição sobre ambiente, uso ou comportamento é hipótese, e deve ser apresentada como tal.
- Ao alterar código existente, não remova o que não foi pedido. Sinalize e deixe a decisão com quem pediu.
- Nunca crie um commit você mesmo. Quando uma unidade de lógica estiver completa na sua forma mínima — uma rota nova, uma extração de constantes, uma correção — entregue na conversa os comandos `git add <arquivos>` e `git commit -m "<mensagem>"` para quem pediu executar. Uma unidade por commit, com o prefixo que a descreve (`feat`, `refactor`, `fix`, `docs`, `chore`). Não agrupe mudanças sem relação nem sugira commit de trabalho pela metade. Nunca inclua rodapé de coautoria nem qualquer atribuição ao assistente na mensagem.
- Mantenha o `JOURNAL.md` atualizado sem esperar pedido. Ele é um resumo curto e público do projeto: o que é, decisões estruturais, estado atual, próximos passos. Enuncie decisão como decisão, não como aprendizado. Não registre ali pendência em aberto, bug encontrado, conceito estudado nem narrativa de depuração — isso vive na conversa e no histórico do Git.
- Ao introduzir dependência nova, rota nova ou entrada vinda de fora, verifique a seção 4 antes de entregar e aponte o que ficou descoberto.

### Consulte a fonte antes de afirmar

Quando a resposta depender do comportamento de uma biblioteca, de uma API externa ou de uma versão específica, leia a documentação oficial ou verifique executando — **antes** de escrever, não depois de errar.

- **Comportamento que muda entre versões é o maior risco.** "Como a biblioteca X faz Y" sem checar a versão instalada é chute com aparência de conhecimento. Confira a versão que está no projeto, não a que você lembra.
- **Executar vale mais que descrever.** Um teste de dez linhas decide o que uma frase confiante não decide. Quando der para rodar, rode.
- **Antes de instalar, confira o que vem.** Tag `latest` já apontou para versão candidata neste projeto, e pacotes de um mesmo conjunto podem ter tags divergentes.
- **Quando não der para verificar, diga.** Apresente como hipótese, nomeie o que impediu a verificação, e não construa recomendação em cima disso.
- **Cite o que foi consultado:** a página, o comando, a saída. Afirmação sem origem não pode ser conferida por quem lê.
- **Recomendação que não se sustentou na verificação é retirada explicitamente**, com o motivo — nunca abandonada em silêncio.
