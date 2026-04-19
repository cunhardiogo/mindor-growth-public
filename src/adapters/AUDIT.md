# FASE 1 — Auditoria de Shapes: Mock vs API Real

> Gerado em: 2026-04-14
> Escopo: mocks hardcoded da versão nova vs hooks/libs do versao2.0.growth

---

## 1. OVERVIEW

### 1a. `growthData` — Gráfico "Evolução de Crescimento"

Shape mock (array, by weekday):
```
{ name: string, faturamento: number, investimento: number, leads: number, roas: number }
```

Shape real — `useAdInsights(period)` → `data.monthly`:
```
MetricMonth { month: string, revenue: number, investment: number, leads: number, roas: number, followers: number, engagement: number, reach: number }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `name` | `month` | renomear | `month → name` |
| `faturamento` | `revenue` | renomear | `revenue → faturamento` |
| `investimento` | `investment` | renomear | `investment → investimento` |
| `leads` | `leads` | igual | direto |
| `roas` | `roas` | igual | direto |
| granularidade `Seg/Ter/...` | `monthly` (mês) ou `daily` (dia) | mock usa dias da semana, API tem por data ISO | usar `daily[]` do hook e formatar `day` (ex: `"14/04"`) |

**Estratégia adapter:** usar `data.daily` para o gráfico semanal, renomear campos. Para o fallback de 6 meses, usar `data.monthly` com `month → name`, `revenue → faturamento`.

---

### 1b. `acquisitionData` — "Canais de Aquisição" (pizza)

Shape mock:
```
{ name: string, value: number, color: string }
// Valores: Meta Ads 45%, Google Ads 30%, Orgânico 15%, Direto 10%
```

Shape real — Nenhuma fonte existente retorna distribuição percentual por canal.

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `name` | `channel` (campo em `CampaignRow`) | parcial | calcular |
| `value` (%) | nenhum campo percentual | AUSENTE | calcular: `(spend_por_canal / spend_total) * 100` usando `useCampaignInsights().campaigns` |
| `color` | nenhum | AUSENTE | definir paleta fixa no adapter (não vem da API) |
| Google Ads, Orgânico, Direto | API só reconhece Meta Ads e Google (via `guessChannel`) | parcial | manter Orgânico/Direto zerados ou remover do mock |

**Estratégia adapter:** agrupar `campaigns` por `channel`, somar `spend`, calcular percentual total. `color` é constante no adapter. Google Ads detectado via nome da campanha (`guessChannel`). Orgânico/Direto indisponíveis via API atual.

---

### 1c. `statisticData` — "Distribuição de Capital" (donut)

Shape mock:
```
{ name: string, value: number, color: string }
// Receita: 75000, Investimento: 25000, Lucro Estimado: 50000
```

Shape real — `useAdInsights().current`:
```
AdAggregate { spend, revenue, leads, impressions, reach, clicks, roas, cpl, ctr }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `Receita` (75000) | `revenue` | renomear | `revenue → Receita` |
| `Investimento` (25000) | `spend` | renomear | `spend → Investimento` |
| `Lucro Estimado` (50000) | não existe | calcular | `revenue - spend` |
| `color` | nenhum | AUSENTE | constante no adapter |

**Estratégia adapter:** `{ Receita: revenue, Investimento: spend, "Lucro Estimado": revenue - spend }`. Color é paleta fixa.

---

### 1d. KPIs fixos do Overview (cards: Faturamento, CPL, Leads, ROAS)

Shape mock: strings hardcoded (`'R$ 45.200'`, `'R$ 4,12'`, `'1.240'`, `'4.8x'`).

Shape real — `useAdInsights().current` (AdAggregate):
```
{ spend, leads, revenue, roas, cpl, ... }
```

| KPI mock | Campo real | Divergência | Estratégia |
|---|---|---|---|
| `Faturamento` | `revenue` | formato | `formatBRL(revenue)` |
| `CPL Médio` | `cpl` | formato | `formatBRL(cpl)` |
| `Leads Gerados` | `leads` | formato | `leads.toLocaleString()` |
| `ROAS Geral` | `roas` | formato | `roas.toFixed(1) + 'x'` |
| `change` (ex: `'+12.5%'`) | calculado entre `current` e `previous` | AUSENTE | `((current.x - previous.x) / previous.x * 100).toFixed(1) + '%'` |

---

### 1e. "Social Awareness" (Instagram no Overview)

Shape mock:
```
Seguidores: '12.4k', Engajamento: '4.2%', Alcance: '85.2k', Visitas Perfil: '2.1k'
```

Shape real — `useInstagramData().current` (IgSnapshot):
```
{ followers, reach, impressions, engagement, profile_views }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `Seguidores` | `followers` | formato | `formatK(followers)` |
| `Engajamento` | `engagement` | formato | `engagement + '%'` |
| `Alcance` | `reach` | formato | `formatK(reach)` |
| `Visitas Perfil` | `profile_views` | formato | `formatK(profile_views)` |

**Nenhum campo ausente.** Todos os 4 campos existem na API. Apenas formatação necessária.

---

## 2. MARKETING

### 2a. `marketingPerformanceData` — Gráfico "Gasto vs Resultado"

Shape mock (array semanal):
```
{ name: string, investimento: number, leads: number, conversoes: number, receita: number }
```

Shape real — `useAdInsights().monthly` (MetricMonth[]):
```
{ month: string, revenue: number, investment: number, leads: number, roas: number, followers: number, engagement: number, reach: number }
```
Ou `useAdInsights().daily[]`:
```
{ day: string, spend: number, leads: number, cpl: number }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `name` | `month` / `day` | renomear | direto |
| `investimento` | `investment` / `spend` | renomear | direto |
| `leads` | `leads` | igual | direto |
| `conversoes` | AUSENTE | AUSENTE | calcular: não disponível. Omitir do gráfico ou buscar de outra fonte |
| `receita` | `revenue` | renomear | direto |

**Campo ausente crítico:** `conversoes` (clientes convertidos) não existe em nenhum hook atual. API Meta retorna `actions` brutos (em `useMetaInsightsLive`), mas `useAdInsights` não expõe. Precisará de cálculo ou remoção do campo.

---

### 2b. `efficiencyData` — "Eficiência das Campanhas" (barras horizontais)

Shape mock:
```
{ name: string, cpl: number, roas: number, conversao: number }
// Por canal: Meta Ads, Google Ads, TikTok Ads, LinkedIn
```

Shape real — `useCampaignInsights().campaigns` (CampaignRow[]):
```
{ id, name, channel, status, spend, leads, impressions, roas, cpl }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `name` (canal) | `channel` | igual | agrupar por `channel`, calcular médias |
| `cpl` | `cpl` | igual | média ponderada por canal |
| `roas` | `roas` | igual | média ponderada por canal |
| `conversao` | AUSENTE | AUSENTE | mesmo problema de `conversoes` acima |
| TikTok Ads | AUSENTE | AUSENTE | `guessChannel` não detecta TikTok; ficará em "Meta Ads" |
| LinkedIn | AUSENTE | AUSENTE | idem |

**Estratégia adapter:** agrupar `campaigns` por `channel`, calcular CPL e ROAS médios por grupo. Remover `conversao` ou mockar como 0. Canais não suportados serão agrupados em "Meta Ads".

---

### 2c. `funnelData` — "Funil de Aquisição"

Shape mock:
```
{ stage: string, value: number, rate: string }
// Impressões: 1.2M, Cliques: 45k, Leads: 2.8k, Clientes: 145
```

Shape real — `useAdInsights().current` (AdAggregate):
```
{ impressions, clicks, leads, revenue, spend, reach, roas, cpl, ctr }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `Impressões` | `impressions` | renomear | direto |
| `Cliques` | `clicks` | renomear | direto |
| `Leads` | `leads` | renomear | direto |
| `Clientes` | AUSENTE | AUSENTE | não existe na API; calcular estimado (`leads * taxa_conversao`) ou remover |
| `rate` (% queda) | AUSENTE | calcular | `((prev - curr) / prev * 100).toFixed(2) + '%'` entre stages |

**Estratégia adapter:** 3 dos 4 stages são diretos. "Clientes" não vem da API de ads; considerar usar `asaas.customers.list()` com contagem total ou remover o stage.

---

### 2d. `campaignPerformance` — Tabela de campanhas

Shape mock:
```
{ name: string, invest: string, leads: number, cpl: string, conv: string, roas: string, status: string }
```

Shape real — `useCampaignInsights().campaigns` (CampaignRow[]):
```
{ id, name, channel, status, spend, leads, impressions, roas, cpl }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `name` | `name` | igual | direto |
| `invest` (string `'R$ 12.500'`) | `spend` (number) | formato | `formatBRL(spend)` |
| `leads` | `leads` | igual | direto |
| `cpl` (string `'R$ 14,70'`) | `cpl` (number) | formato | `formatBRL(cpl)` |
| `conv` (string `'5.2%'`) | AUSENTE | AUSENTE | não disponível; omitir coluna ou calcular se houver fonte |
| `roas` (string `'4.2x'`) | `roas` (number) | formato | `roas.toFixed(1) + 'x'` |
| `status` (`'Bom'`/`'Médio'`/`'Ruim'`) | `status` (`'ACTIVE'`/`'PAUSED'`/etc.) | semântica diferente | calcular: ROAS > 3 → Bom, > 1.5 → Médio, ≤ 1.5 → Ruim |

---

### 2e. KPIs do topo Marketing (6 cards)

Shape mock: strings hardcoded.
Shape real — `useAdInsights().current` + `.previous`:

| KPI mock | Campo real | Estratégia |
|---|---|---|
| `Investimento Total` | `spend` | `formatBRL(current.spend)` |
| `Leads Gerados` | `leads` | `current.leads.toLocaleString()` |
| `CPL Médio` | `cpl` | `formatBRL(current.cpl)` |
| `ROAS Geral` | `roas` | `current.roas.toFixed(1) + 'x'` |
| `Taxa Conv.` | AUSENTE | calcular ou omitir |
| `CAC` | AUSENTE | calcular: `spend / clientes_novos`; `clientes_novos` não disponível diretamente |
| `change` percentual | via `previous` | `delta(current.x, previous.x)` |

---

### 2f. Métricas do Período (6 cards de baixo)

| KPI mock | Campo real | Estratégia |
|---|---|---|
| `Impressões` | `current.impressions` | `formatM(impressions)` |
| `Alcance` | `current.reach` | `formatK(reach)` |
| `Cliques` | `current.clicks` | `formatK(clicks)` |
| `CTR Médio` | `current.ctr` | `ctr.toFixed(2) + '%'` |
| `CPC Médio` | AUSENTE de AdAggregate | calcular: `spend / clicks` |
| `Frequência` | AUSENTE de AdAggregate | disponível em `useMetaInsightsLive.data[].frequency` (live); não está em `useAdInsights` |

**Campo parcialmente ausente:** `CPC` pode ser calculado. `Frequência` requer `useMetaInsightsLive` ou extensão do `useAdInsights`.

---

## 3. INSTAGRAM

### 3a. `instagramKPIs` — 4 KPIs do topo

Shape mock:
```
{ label: string, value: string, change: string, status: string, sub: string, data: number[] }
```

Shape real — `useInstagramData().current` (IgSnapshot):
```
{ followers, reach, impressions, engagement, profile_views }
```
e `.previous` para `change`.

| KPI mock | Campo real | Divergência | Estratégia |
|---|---|---|---|
| `Seguidores` | `followers` | formato | `formatK(followers)` |
| `Alcance` | `reach` | formato | `formatK(reach)` |
| `Impressões` | `impressions` | formato | `formatM(impressions)` |
| `Engajamento` | `engagement` | formato | `engagement.toFixed(2) + '%'` |
| `change` | calculado entre `current` e `previous` | calcular | `delta(current.x, previous.x)` |
| `data` (mini sparkline array) | `growth[]` (6 meses) | formato | extrair campo específico de `growth` por KPI |

**Campo ausente:** `data` (sparkline) precisa ser extraído de `growth[]` — ex: para "Seguidores", mapear `growth.map(g => g.followers)`.

---

### 3b. `instagramFollowersHistory` — Gráfico evolução de seguidores

Shape mock:
```
{ date: string, followers: number }
// ex: { date: '01/04', followers: 11200 }
```

Shape real — `useInstagramData().growth`:
```
{ month: string, followers: number, reach: number, impressions: number, engagement: number }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `date` | `month` (string de período) | semântica | renomear; `month` é identificador de período (ex: `'last_30d'`), não data legível. Precisará de formatação |
| `followers` | `followers` | igual | direto |

**Divergência importante:** o eixo X do mock usa datas diárias (`'01/04'`, `'05/04'`). O hook `useInstagramData` retorna granularidade **mensal** (`growth` é 6 períodos). Para granularidade diária, seria necessário usar `useInstagramInsightsLive` e processar `insights` (timeseries de `reach` por dia). Followers diários não estão disponíveis via Supabase.

**Estratégia adapter:** usar `growth[]` para gráfico mensal (6 pontos). Para diário, usar `useInstagramInsightsLive.insights` (raw IG API, timeseries de `reach`; followers diários não expõe a API do Meta).

---

### 3c. `instagramReachImpressionsHistory` — Alcance vs Impressões

Shape mock:
```
{ month: string, reach: number, impressions: number }
```

Shape real — `useInstagramData().growth`:
```
{ month: string, followers: number, reach: number, impressions: number, engagement: number }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `month` | `month` | igual (mas é período, não label legível) | formatar para label (ex: `'Abr'`) |
| `reach` | `reach` | igual | direto |
| `impressions` | `impressions` | igual | direto |

**Divergência menor:** `month` do hook retorna o identificador de período (`'last_30d'`, `'2026-03'`, etc.), não o label curto do mock (`'Jan'`, `'Fev'`). Necessita formatação.

---

### 3d. `instagramEngagementByType` — Distribuição por formato

Shape mock:
```
{ type: string, value: number, color: string }
// Reels: 65%, Feed: 25%, Stories: 10%
```

Shape real — Nenhum hook atual retorna breakdown de engajamento por tipo de mídia.

- `useInstagramData().posts` tem `type` (media_type) por post, mas não agrega por formato.
- `useInstagramInsightsLive.demographics` retorna dados de audiência, não distribuição de conteúdo.

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `type` (Reels/Feed/Stories) | `posts[].type` (media_type) | calcular | agrupar `posts` por `type`, somar interações (likes + comments + saves + shares), calcular % |
| `value` (%) | AUSENTE direto | calcular | soma de engajamento por tipo / total |
| `color` | AUSENTE | constante | paleta fixa no adapter |

**Estratégia adapter:** agrupar `posts[]` por `type`, somar `likes + comments + saves + shares`, calcular percentual do total. Mapear `media_type` da API (`IMAGE`, `VIDEO`, `CAROUSEL_ALBUM`) para labels legíveis (`Feed`, `Reels`, `Carrossel`).

---

### 3e. `instagramTopContent` — Top posts

Shape mock:
```
{ id: number, image: string, likes: string, comments: string, reach: string }
```

Shape real — `useInstagramData().posts` (IgPost[]):
```
{ id: string, caption: string|null, type: string, date: string, likes: number, comments: number, reach: number, saves: number, shares: number }
```
E `useInstagramInsightsLive.media[]`:
```
{ id, media_type, media_url, thumbnail_url, permalink, timestamp, like_count, comments_count, media_product_type }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `id` (number) | `id` (string post_id) | tipo | usar string diretamente |
| `image` (URL picsum placeholder) | `media_url` / `thumbnail_url` (live) ou AUSENTE em Supabase | AUSENTE em Supabase | usar `useInstagramInsightsLive.media[].media_url`; `useInstagramData` não armazena URL da imagem |
| `likes` (string `'1.2k'`) | `likes` (number) | formato | `formatK(likes)` |
| `comments` (string `'85'`) | `comments` (number) | formato | `String(comments)` |
| `reach` (string `'12k'`) | `reach` (number) | formato | `formatK(reach)` |

**Campo ausente crítico:** `media_url` não está na tabela `instagram_posts` do Supabase (não é armazenada). Precisará vir de `useInstagramInsightsLive.media[]` (live API) ou exige migração do schema Supabase para incluir `media_url`.

---

## 4. FINANCEIRO

### 4a. `financialOverviewData` — Cards Overview

Shape mock:
```
{
  balance: string,        // 'R$ 156.200,00'
  received: string,       // 'R$ 82.400,00'
  toReceive: string,      // 'R$ 45.100,00'
  delinquency: string,    // 'R$ 8.200,00'
  estimatedProfit: string,// 'R$ 54.000,00'
  forecast30d: string     // 'R$ 48.000,00'
}
```

Shape real — `asaas.finance.balance()` → `AsaasBalance`:
```
{ balance: number, availableBalance: number }
```
`asaas.payments.list()` → `AsaasPayment[]`:
```
{ id, customer, billingType, status, value, netValue, dueDate, paymentDate, description, ... }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `balance` | `AsaasBalance.balance` | formato | `formatBRL(balance)` |
| `received` | CALCULAR de `payments` com `status: RECEIVED\|CONFIRMED` no mês | calcular | filtrar pagamentos recebidos no mês corrente, somar `value` |
| `toReceive` | CALCULAR de `payments` com `status: PENDING` e `dueDate` futuro | calcular | filtrar `PENDING` com dueDate >= hoje |
| `delinquency` | CALCULAR de `payments` com `status: OVERDUE` | calcular | filtrar `OVERDUE`, somar `value` |
| `estimatedProfit` | AUSENTE direto | calcular | `received - custos`; custos não disponíveis na API Asaas. Considerar `netValue` acumulado ou remover |
| `forecast30d` | AUSENTE | calcular | soma de `value` de `PENDING` com dueDate nos próximos 30 dias |

**Campo sem fonte adequada:** `estimatedProfit` e `forecast30d` requerem lógica de negócio não disponível diretamente no Asaas. Considerar calcular `received - spend_ads` cruzando com `useAdInsights`.

---

### 4b. `cashFlowChartData` — Fluxo de Caixa

Shape mock:
```
{ month: string, entradas: number, saidas: number, saldo: number }
```

Shape real — `asaas.finance.transactions()` → `AsaasTransaction[]`:
```
{ id, value, balance, type: 'CREDIT'|'DEBIT', date, description }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `month` | `date` (ISO string) | agrupar | agrupar transactions por mês, extrair label |
| `entradas` | `value` onde `type === 'CREDIT'` | calcular | somar `value` dos `CREDIT` por mês |
| `saidas` | `value` onde `type === 'DEBIT'` | calcular | somar `value` dos `DEBIT` por mês |
| `saldo` | `balance` (saldo acumulado) | calcular | usar último `balance` do mês ou calcular `entradas - saidas` |

**Estratégia adapter:** buscar `financialTransactions` paginando, agrupar por mês, somar créditos/débitos. `saldo` usa o último `balance` do mês.

---

### 4c. `invoicesData` — Tabela de cobranças

Shape mock:
```
{ id: string, client: string, value: string, due: string, status: string, method: string }
```

Shape real — `asaas.payments.list()` → `AsaasPayment`:
```
{ id, customer, billingType, status, value, netValue, dueDate, paymentDate, description }
```
e `asaas.customers.list()` → `AsaasCustomer`:
```
{ id, name, email, cpfCnpj, phone, ... }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `id` | `id` | igual | direto |
| `client` | `customer` (é um ID, não nome) | INDIRETO | join com customers: buscar `customer.name` pelo ID |
| `value` (string `'R$ 4.500,00'`) | `value` (number) | formato | `formatBRL(value)` |
| `due` | `dueDate` (ISO `'2024-04-20'`) | formato | direto ou formatar para BR |
| `status` (`'Pendente'`/`'Pago'`/`'Atrasado'`) | `status` (enum `PENDING`/`RECEIVED`/`OVERDUE`/etc.) | semântica | mapear: `PENDING → 'Pendente'`, `RECEIVED\|CONFIRMED → 'Pago'`, `OVERDUE → 'Atrasado'` |
| `method` (`'Boleto'`/`'Pix'`/`'Cartão'`) | `billingType` (`BOLETO`/`PIX`/`CREDIT_CARD`) | semântica | mapear: `BOLETO → 'Boleto'`, `PIX → 'Pix'`, `CREDIT_CARD → 'Cartão'` |

**Campo indireto crítico:** `client` requer lookup no endpoint de customers por ID. Será necessário cache de customers ou join no adapter.

---

### 4d. `subscriptionsData` — Assinaturas

Shape mock:
```
{ id: string, client: string, plan: string, value: string, cycle: string, status: string }
```

Shape real — `asaas.subscriptions.list()` → `AsaasSubscription`:
```
{ id, customer, billingType, status, value, cycle, nextDueDate, description }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `id` | `id` | igual | direto |
| `client` | `customer` (ID) | INDIRETO | join com customers (mesmo problema das cobranças) |
| `plan` | AUSENTE | AUSENTE | Asaas não tem campo `plan`. Pode ser inferido de `description` ou precisa ser cadastrado manualmente |
| `value` (string) | `value` (number) | formato | `formatBRL(value)` |
| `cycle` (`'Mensal'`/`'Anual'`) | `cycle` (enum: `MONTHLY`/`YEARLY`/etc.) | semântica | mapear: `MONTHLY → 'Mensal'`, `YEARLY → 'Anual'`, etc. |
| `status` (`'Ativo'`/`'Cancelado'`) | `status` (`ACTIVE`/`INACTIVE`/`EXPIRED`) | semântica | mapear: `ACTIVE → 'Ativo'`, outros → 'Cancelado'/'Inativo' |

**Campo ausente crítico:** `plan` (Enterprise/Pro/Basic) não existe no Asaas. Precisará ser armazenado no Supabase como metadado de assinatura, ou inferido do campo `description`.

---

### 4e. KPIs de Assinaturas (MRR, ARR, Clientes Ativos, Churn)

| KPI mock | Campo real | Divergência | Estratégia |
|---|---|---|---|
| `MRR` | CALCULAR | calcular | somar `value` de subscriptions `ACTIVE` e `cycle === MONTHLY`; para YEARLY dividir por 12 |
| `ARR` | CALCULAR | calcular | `MRR * 12` |
| `Clientes Ativos` | CALCULAR | calcular | contar subscriptions com `status === ACTIVE` |
| `Churn Rate` | AUSENTE | calcular | `INACTIVE + EXPIRED / total_inicial * 100`; requer histórico que Asaas não fornece diretamente |
| `LTV` | AUSENTE | calcular | sem fonte direta; aproximar como `MRR / churn_rate` ou calcular manualmente |
| `Tempo Médio Contrato` | AUSENTE | AUSENTE | não disponível no Asaas |
| `Expansão de Receita` | AUSENTE | AUSENTE | não disponível sem histórico de mudanças de valor |

---

### 4f. `customersFinancialData` — Saúde por Cliente

Shape mock:
```
{ name: string, revenue: string, ltv: string, status: string, risk: string }
```

Shape real — `asaas.customers.list()` + `asaas.payments.list()`:
```
AsaasCustomer { id, name, ... }
AsaasPayment { customer, value, status, ... }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `name` | `customer.name` | igual | direto |
| `revenue` | CALCULAR | calcular | somar `payments[].value` para `status RECEIVED/CONFIRMED` por customer |
| `ltv` | AUSENTE | calcular | aproximar como histórico total de `value` recebido; requer todos os pagamentos do cliente |
| `status` (`'Ativo'`/`'Inativo'`) | inferido de subscriptions | calcular | verificar se tem subscription `ACTIVE` |
| `risk` | AUSENTE | calcular | derivar de: tem pagamentos `OVERDUE`? → Alto; tem `PENDING` próximo? → Médio; else Baixo |

---

### 4g. `delinquencyListData` — Inadimplência

Shape mock:
```
{ client: string, value: string, days: number, risk: string }
```

Shape real — `asaas.payments.list({ status: 'OVERDUE' })` → `AsaasPayment[]`:
```
{ id, customer, value, dueDate, status }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `client` | `customer` (ID) | INDIRETO | join com customers |
| `value` (string) | `value` (number) | formato | `formatBRL(value)` |
| `days` | CALCULAR | calcular | `Math.floor((hoje - new Date(dueDate)) / 86400000)` |
| `risk` | AUSENTE | calcular | `days > 10 → Alto`, `days > 3 → Médio`, else `Baixo` |

---

### 4h. `statementData` — Extrato

Shape mock:
```
{ date: string, desc: string, type: string, value: string, balance: string }
```

Shape real — `asaas.finance.transactions()` → `AsaasTransaction`:
```
{ id, value, balance, type: 'CREDIT'|'DEBIT', date, description }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `date` | `date` | formato | `date.slice(0,10)` |
| `desc` | `description` | renomear | direto |
| `type` (`'Entrada'`/`'Saída'`) | `type` (`'CREDIT'`/`'DEBIT'`) | semântica | mapear: `CREDIT → 'Entrada'`, `DEBIT → 'Saída'` |
| `value` (string) | `value` (number) | formato | `formatBRL(value)` |
| `balance` (string) | `balance` (number) | formato | `formatBRL(balance)` |

**Mapeamento mais direto de todas as seções financeiras.**

---

## 5. FATURAMENTO

### 5a. `billingHistoryData` — Gráfico Receita vs Investimento

Shape mock:
```
{ month: string, receita: number, investimento: number }
```

Shape real — `useAdInsights().monthly` (MetricMonth[]):
```
{ month: string, revenue: number, investment: number, leads: number, roas: number, ... }
```

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `month` | `month` | igual (mesmo problema de formato) | formatar período para label curto |
| `receita` | `revenue` | renomear | `revenue → receita` |
| `investimento` | `investment` | renomear | `investment → investimento` |

**Mapeamento mais simples do projeto — apenas renomear campos.**

---

### 5b. KPIs do Faturamento

| KPI mock | Campo real | Estratégia |
|---|---|---|
| `Receita Total` | `useAdInsights().current.revenue` | `formatBRL(revenue)` |
| `Margem Bruta` | calcular `revenue - spend` | direto dos campos `AdAggregate` |
| `Receita / Lead` | calcular `revenue / leads` | `formatBRL(revenue / leads)` |
| `Investimento Ads` | `useAdInsights().current.spend` | `formatBRL(spend)` |
| `ROAS` | `current.roas` | `roas.toFixed(1) + 'x'` |
| `CPL` | `current.cpl` | `formatBRL(cpl)` |
| `Leads` | `current.leads` | `leads.toLocaleString()` |
| `Impressões` | `current.impressions` | `formatM(impressions)` |

---

## 6. METAS / TIMELINE / CLIENTES

### 6a. MetasPage
Placeholder puro — sem mock de dados. Fonte futura: tabela Supabase `goals` (hook `useGoals` existe).
**Estratégia:** conectar `useGoals` quando a página for implementada.

### 6b. TimelinePage
Placeholder puro — sem mock de dados. Fonte futura: tabela Supabase `timeline` (hook `useTimeline` existe).
**Estratégia:** conectar `useTimeline` quando a página for implementada.

### 6c. ClientesPage
Shape mock:
```
{ name: string, status: string, date: string, total: string }
```

Shape real — não há hook de clientes Supabase específico para a versão nova. Asaas tem `customers.list()`.

| Campo mock | Campo API real | Divergência | Estratégia |
|---|---|---|---|
| `name` | `AsaasCustomer.name` | igual | direto |
| `status` (`'Ativo'`/`'Pendente'`) | inferido de subscriptions | calcular | verificar subscription ativa |
| `date` (última compra) | `payment.paymentDate` mais recente | calcular | buscar último pagamento do cliente |
| `total` (total gasto) | CALCULAR de payments | calcular | somar `value` de `RECEIVED/CONFIRMED` por cliente |

KPIs de `ClientesPage` (Total de Clientes, LTV Médio, Churn Rate):

| KPI | Fonte | Estratégia |
|---|---|---|
| `Total de Clientes` | `customers.list().totalCount` | direto |
| `LTV Médio` | CALCULAR | `total_recebido / total_clientes` |
| `Churn Rate` | AUSENTE | mesmo problema da seção Assinaturas |

---

## RESUMO DE DIVERGÊNCIAS CRÍTICAS

| # | Divergência | Seções afetadas | Impacto |
|---|---|---|---|
| 1 | **`conversoes`/`conv`/`Taxa Conv.`** ausente em todos os hooks | Marketing (2a, 2b, 2d, 2e) | Alto — coluna/campo em 4 locais |
| 2 | **`client` em cobranças/assinaturas requer join** com customers | Financeiro (4c, 4d, 4f, 4g, 6c) | Alto — toda tabela financeira |
| 3 | **`plan`** (Enterprise/Pro/Basic) inexistente no Asaas | Assinaturas (4d) | Alto — campo visível na tabela |
| 4 | **`media_url`** não armazenada em `instagram_posts` Supabase | Instagram Top Content (3e) | Alto — sem imagem do post |
| 5 | **Granularidade diária de followers** não disponível | Instagram seguidores (3b) | Médio — gráfico com granularidade mensal |
| 6 | **`estimatedProfit` e `forecast30d`** sem fonte direta | Financeiro Overview (4a) | Médio — requer cruzamento de fontes |
| 7 | **`Churn Rate`, `LTV`, `CAC`** sem dados de história | Assinaturas, Clientes (4e, 6c) | Médio — métricas calculadas sem base |
| 8 | **`acquisitionData`** (Orgânico/Direto) sem fonte | Overview (1b) | Médio — canais não rastreados |
| 9 | **`engajamento por formato`** requer agregação manual de posts | Instagram (3d) | Médio — cálculo possível |
| 10 | **`Frequência`** ausente de `useAdInsights` | Marketing (2f) | Baixo — disponível em live hook |
| 11 | **Formatação de `month`** (período → label legível) | Marketing, Instagram, Faturamento | Baixo — função utilitária única resolve |
| 12 | **Status semântico** (`ACTIVE → Ativo`, etc.) | Financeiro geral | Baixo — mapas de constantes simples |

---

## FASE 2 — Auth + Router

> Gerado em: 2026-04-15

### SQL necessário: tabela `profiles`

A tabela `profiles` precisa existir no Supabase para que o AuthContext funcione.
Execute no SQL Editor do Supabase:

```sql
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  role        text not null default 'client' check (role in ('admin', 'client')),
  "adAccountId"   text,
  "instagramId"   text,
  created_at  timestamptz default now()
);

-- RLS: cada usuário lê apenas o próprio perfil; admin lê todos
alter table public.profiles enable row level security;

create policy "Usuário lê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admin lê todos os perfis"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Trigger para criar perfil automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'client'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Campos usados pelo AuthContext (`src/contexts/AuthContext.tsx`)

| Campo Supabase | Tipo | Obrigatório |
|---|---|---|
| `id` | uuid (PK) | Sim |
| `name` | text | Não (fallback para email) |
| `email` | text | Não (preenchido via trigger) |
| `role` | text enum admin/client | Sim (default: client) |
| `adAccountId` | text | Não (usado para filtro client) |
| `instagramId` | text | Não (usado para filtro client) |
