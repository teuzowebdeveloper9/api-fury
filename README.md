# FURY Click Hero API

Mini-API em Node.js + TypeScript para o desafio tecnico FURY. A API recebe um webhook de violacao de anuncio, valida o payload com Zod, enfileira um job de takedown com BullMQ/Redis e executa um worker que chama a API publica JSONPlaceholder como simulacao da Meta Ads API.

## Deploy publicado

A API esta publicada em:

```text
https://api-fury.onrender.com
```

Nao e necessario rodar o projeto localmente para validar o fluxo principal do desafio. O deploy usa:

- Render Web Service para rodar a API NestJS e o worker BullMQ no mesmo processo.
- Upstash Redis como Redis gerenciado para armazenar a fila e o estado dos jobs.
- JSONPlaceholder como endpoint externo de simulacao da Meta API.

### Como testar o deploy

Crie um job:

```bash
curl -X POST https://api-fury.onrender.com/webhook/violation \
  -H "Content-Type: application/json" \
  -d '{
    "adId": "ad_render_001",
    "tenantId": "tenant_render",
    "violationType": "BRAND_VIOLATION",
    "severity": "HIGH",
    "detectedAt": "2026-05-21T14:00:00.000Z"
  }'
```

Use o `jobId` retornado para consultar o status:

```bash
curl https://api-fury.onrender.com/jobs/<jobId>
```

Exemplo de retorno esperado apos o worker processar:

```json
{
  "jobId": "takedown-...",
  "status": "completed",
  "attempts": 1,
  "result": {
    "ok": true,
    "externalStatus": 200,
    "processedAt": "2026-05-21T15:41:14.027Z"
  },
  "error": null
}
```

Tambem e possivel testar validacao enviando um payload invalido. A API retorna `400` com os erros detalhados do Zod.

### Decisao de deploy

Foram consideradas algumas opcoes para deploy gratuito ou de baixo custo:

- Oracle Cloud com VM e Docker Compose, mantendo Redis e API em containers separados na mesma maquina.
- Google Cloud Compute Engine com VM, tambem usando Docker Compose com uma porta/container para a API e Redis isolado na rede Docker.
- Render com Upstash Redis.

Para este desafio tecnico, a escolha final foi Render + Upstash Redis. O motivo foi pragmatismo: como o objetivo e demonstrar a integracao com BullMQ, idempotencia, retry e processamento do worker, usar um Redis gerenciado e um Web Service simples evita complexidade operacional desnecessaria para uma entrega de teste. Uma VM com Docker funcionaria bem, mas adicionaria manutencao de servidor, firewall, atualizacoes do SO, rede e persistencia manual. Para este contexto, isso seria mais proximo de overengineering do que de valor para o desafio.

Observacao: no plano gratuito do Render, o servico pode dormir apos periodo de inatividade. Os jobs continuam armazenados no Upstash Redis, mas o worker so processa enquanto o servico esta acordado. Para producao real, a recomendacao seria usar um plano sem sleep ou separar API e worker em servicos dedicados.

## Stack

- Node.js 20+
- TypeScript strict
- NestJS
- Zod
- BullMQ
- Redis local via Docker Compose ou Upstash Redis no deploy
- Jest
- ESLint

## Arquitetura

O projeto usa uma organizacao por feature com camadas limpas:

```text
src/
  config/
  takedown/
    domain/
    application/
      ports/
      use-cases/
    infrastructure/
      http/
      queue/
    interfaces/
      http/
      queue/
```

Regra de dependencia:

```text
interfaces -> application -> domain
infrastructure -> application
```

O dominio nao importa Nest, BullMQ, Redis, clientes HTTP ou configuracao. A aplicacao define os casos de uso e portas. A infraestrutura implementa as portas. As interfaces entregam HTTP e processamento de fila.

## Pesquisa inicial

Antes de codar, foi feita uma janela de pelo menos 3 minutos de `curl` contra `https://jsonplaceholder.typicode.com/posts/1`. O endpoint retornou `200` em todas as amostras reais, com tempos em torno de 50ms a 75ms. Um timeout induzido com `--max-time 0.001` retornou falha de timeout, e uma chamada curta para `/posts/999999` retornou `404`.

Decisoes derivadas disso:

- `2xx` e tratado como sucesso.
- `4xx/5xx` vira erro controlado e deixa o BullMQ aplicar retry.
- Timeout/erro de rede tambem vira erro controlado e retryavel.
- O corpo da resposta externa nao e validado nem mapeado, porque o desafio pede apenas testar o fluxo HTTP.

Referencias oficiais consultadas:

- NestJS Queues: https://docs.nestjs.com/techniques/queues
- NestJS Pipes: https://docs.nestjs.com/pipes
- BullMQ retries/backoff: https://docs.bullmq.io/guide/retrying-failing-jobs

## Requisitos atendidos

- `POST /webhook/violation` recebe o webhook.
- Payload validado com Zod e erro `400` detalhado em caso invalido.
- BullMQ enfileira job `meta-ad-takedown`.
- Redis roda localmente via Docker Compose.
- Worker chama `https://jsonplaceholder.typicode.com/posts/1`.
- Retry automatico com backoff exponencial, maximo de 3 tentativas por padrao.
- Idempotencia por `adId + tenantId` usando `jobId` deterministico com SHA-256.
- `GET /jobs/:id` retorna `{ jobId, status, attempts, result, error }`.

## Como rodar localmente

Instale as dependencias:

```bash
npm install
```

Suba o Redis local:

```bash
docker compose up -d redis
```

Crie seu `.env` a partir do exemplo, se quiser sobrescrever defaults:

```bash
cp .env.example .env
```

Inicie a API e o worker no mesmo processo Nest:

```bash
npm run start:dev
```

A API sobe em `http://localhost:3000` por padrao.

## Payload do webhook

```json
{
  "adId": "ad_123",
  "tenantId": "tenant_456",
  "violationType": "BRAND_VIOLATION",
  "severity": "HIGH",
  "detectedAt": "2026-05-21T14:00:00.000Z"
}
```

Exemplo:

```bash
curl -X POST http://localhost:3000/webhook/violation \
  -H "Content-Type: application/json" \
  -d '{
    "adId": "ad_123",
    "tenantId": "tenant_456",
    "violationType": "BRAND_VIOLATION",
    "severity": "HIGH",
    "detectedAt": "2026-05-21T14:00:00.000Z"
  }'
```

Resposta esperada:

```json
{
  "jobId": "takedown-...",
  "status": "waiting",
  "deduplicated": false
}
```

Se o mesmo `adId + tenantId` for enviado novamente, o mesmo `jobId` sera retornado e nenhum segundo job sera criado para a mesma chave.

## Consultar status

```bash
curl http://localhost:3000/jobs/takedown-<sha256>
```

Resposta:

```json
{
  "jobId": "takedown-...",
  "status": "completed",
  "attempts": 1,
  "result": {
    "ok": true,
    "externalStatus": 200,
    "processedAt": "2026-05-21T14:00:00.000Z"
  },
  "error": null
}
```

## Variaveis de ambiente

| Nome | Default | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP da API |
| `HOST` | `0.0.0.0` | Interface de rede para escutar em deploys como Render |
| `REDIS_HOST` | `localhost` | Host do Redis |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `REDIS_PASSWORD` | vazio | Senha do Redis, se existir |
| `REDIS_TLS` | `false` | Use `true` para Redis hospedado com TLS, como Upstash |
| `META_API_SIMULATION_URL` | `https://jsonplaceholder.typicode.com/posts/1` | Endpoint HTTP externo usado pelo worker |
| `META_API_TIMEOUT_MS` | `3000` | Timeout da chamada externa |
| `TAKEDOWN_JOB_ATTEMPTS` | `3` | Maximo de tentativas do job |
| `TAKEDOWN_JOB_BACKOFF_MS` | `1000` | Delay base do backoff exponencial |

## Scripts

- `npm run start:dev`: inicia API e worker com watch.
- `npm run build`: compila o projeto Nest.
- `npm run start`: roda `dist/main.js`.
- `npm run typecheck`: valida TypeScript sem emitir arquivos.
- `npm run lint`: roda ESLint.
- `npm test`: roda Jest.
- `npm run test:watch`: Jest em watch mode.
- `npm run test:coverage`: Jest com cobertura.

## Testes com Jest

Os testes focam em comportamento de aplicacao e validacao de entrada:

- `ReportViolationUseCase` garante `jobId` deterministico e nao revelador.
- `violationWebhookSchema` garante rejeicao de payload invalido com issues por campo.

Infraestrutura externa e mockada por portas quando necessario. Testes unitarios nao fazem chamadas HTTP reais.

## Seguranca

- `.env` e ignorado pelo Git.
- Apenas `.env.example` e versionado.
- O `jobId` usa SHA-256 de `tenantId + adId`, evitando expor esses valores em URLs.
- O worker nao loga payload completo.
- Erros da chamada externa sao normalizados sem incluir corpo da resposta.
- `helmet` e habilitado na inicializacao do Nest.

## Bootstrap gerado por `inicie-um-projeto`

Este projeto foi iniciado com o skill `inicie-um-projeto`.

O bootstrap:

- Criou limites de arquitetura limpa dentro do modulo NestJS.
- Adicionou `AGENTS.md` e `CLAUDE.md` para manter as mesmas regras com assistentes de IA.
- Configurou Jest desde o inicio.
- Documentou comandos, variaveis, fluxo Docker Redis e padroes de codigo.
- Fez uma pesquisa rapida em documentacao oficial de NestJS/BullMQ antes de consolidar o layout.

## Fluxo de desenvolvimento

1. Alterar dominio/aplicacao primeiro.
2. Adicionar ou ajustar testes Jest.
3. Implementar adaptadores em infraestrutura.
4. Expor comportamento via controllers/processors.
5. Rodar `npm run typecheck`, `npm test`, `npm run lint` e `npm run build`.
6. Atualizar README quando endpoints, comandos, variaveis ou arquitetura mudarem.
