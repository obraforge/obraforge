# ADR-0006 — Endurecimento do validador depois do gate da fase 0

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto (cada escolha abaixo foi tomada por ele durante o gate)
- **Amplia:** as regras do validador do *Catálogo · Skills — Spec* §13 e do plano da fase 0 §6 (B1).
  Os 10 códigos de regra continuam os mesmos; o que muda é o que cada um acusa.

## Contexto

O gate adversarial da fase 0 (duas lentes internas, contra-refutação por tema e duas reverificações)
confirmou 14 achados no validador e, depois das correções, mais 8 e mais 10. O pipeline de
publicação resistiu a tudo; o que caiu foi o validador como cerca de conteúdo de skill vindo de PR
de terceiro. A mesma classe de achado apareceu duas vezes seguidas: **contorno de lista enumerada**
(termos, extensões, grafias). Isso mostrou que a hipótese "a varredura de termos é uma cerca
confiável" estava errada.

## Decisão

1. **A varredura de termos da `AGENCIA` é um alarme, não uma cerca.** Ela pega o autor descuidado e
   é ampliada por PR, mas nunca vai ser completa. As barreiras são as camadas estruturais abaixo e a
   **revisão humana obrigatória** de PR de terceiro (D-012: uma aprovação do dono).
2. **Camadas estruturais do validador:**
   - **Lista branca do frontmatter:** no topo só `name`, `description`, `license`, `compatibility` e
     `metadata` (o padrão Agent Skills, sem `allowed-tools`); no `metadata` só `obraforge-area`,
     `obraforge-fase` e `obraforge-versao`. Chave fora da lista: `AGENCIA` (topo) ou `METADATA`.
   - **Sintaxe de execução do Claude Code** (`` !` `` e bloco cercado aberto com `!`): `AGENCIA`.
   - **Código antes da fase 3:** arquivo com extensão de código em **qualquer** pasta da skill, não só
     em `scripts/`: `SCRIPTS`.
   - **Tipos de arquivo:** lista branca de extensões binárias (planilhas sem macro, PDF, imagens e
     formatos de obra como `.dwg`, `.kmz`, shapefile, `.mpp`, `.ifczip`), com teto de 5 MiB e sem
     varredura de conteúdo. **Todo o resto precisa ser UTF-8** e é varrido, com teto de 1 MiB.
     Excel com macro (`.xlsm`) e arquivo compactado (`.zip`) ficam de fora.
   - **Nomes:** arquivo ou pasta oculto, ou com caractere invisível ou espaço não ASCII, dentro da
     skill: `ESTRUTURA`.
   - **Normalização antes de varrer:** NFKC, remoção de caracteres ignoráveis, de controle, de uso
     privado e não-caracteres, entidades HTML decodificadas, comentários HTML removidos (sem deixar
     de varrer o texto original), continuação de linha juntada, e comparação dos termos também pelo
     esqueleto de caracteres confundíveis do Unicode.
   - **Tabela de confundíveis** gerada do `confusables.txt` oficial (UTS #39, versão 18.0.0, SHA-256
     fixado, Unicode License v3) por `tools/scripts/generate-confusables.mjs`. Atualizar a versão é
     manual: trocar `VERSION` e `SHA256` no script e rodar de novo.
   - **Tetos antes do parse:** frontmatter com até 16 KiB.
3. **Termos que só valem fora da sigla:** `SCP` (Sociedade em Conta de Participação) e `RCP`
   (reanimação cardiopulmonar) em maiúsculas exatas não são acusados; qualquer outra grafia é.
   `nc`, `ftp`, `Stop`, `Setup`, `Notification` e `Elicitation` ficam fora da lista por falso
   positivo em texto de obra.
4. **`NORMA`:** reconhece as formas reais de citação (NBR com hífen, Lei/Decreto com Federal,
   Estadual ou Municipal, "Leis A e B", Resolução com o órgão antes ou depois do número). Sigla só com
   maiúsculas dispensa o `nº`; órgão em caixa mista exige, para "resolução mínima 300 dpi" não virar
   citação. O `references` do catálogo guarda a chave canônica da norma.
5. **Catálogo:** o hash usa o caminho em NFC e ignora arquivo oculto, para o CI reproduzir o hash
   gerado no macOS; o BOM é tirado como no validador.
6. **Não haverá rodada 4 de caça** sobre esta versão. Achados novos entram como issue e seguem o
   fluxo normal de PR.

## Consequências

- Boas: os exploits do gate estão cobertos por teste (834 no `tools`); o que o validador garante
  agora está escrito, e o que ele não garante também.
- Ruins:
  - O validador ficou mais estrito: binário fora da lista branca, arquivo com nome estranho ou
    frontmatter com chave própria do Claude Code são recusados até alguém ampliar a regra por PR.
  - Um CPF ou um termo da lista escondido por técnica fora das cobertas passa; o revisor humano é a
    barreira.

## Limitações aceitas

- Conteúdo de binário da lista branca, **inclusive PDF, que o agente consegue ler**, não é varrido.
  Revisitar na fase 1, antes da primeira skill com fixture binária (ex.: exigir versão em texto ou
  extrair o texto com dependência avaliada).
- Termo partido por ênfase de markdown (`cu**rl**`), comentário HTML que atravessa linhas e entidades
  nomeadas fora das cinco comuns.
- Qualquer sinônimo de rede, execução ou configuração que não esteja na lista.
- Homóglifo grego ou armênio só é pego quando forma um termo da lista; a regra de mistura de
  alfabetos cobre só latino com cirílico (o grego aparece em fórmulas de engenharia).
- `NORMA` é por linha: citação quebrada pela quebra de linha não é extraída; texto todo em
  maiúsculas ("RESOLUÇÃO NOMINAL 1920") pode virar citação falsa.
- "hooks de içamento" é acusado: a spec lista `hook`, e o falso positivo é aceito.
- `.sql` e `.r` contam como código antes da fase 3.

## Alternativas rejeitadas

- **Continuar caçando por enumeração até não sobrar contorno:** a mesma classe de achado voltou duas
  vezes; mais uma rodada teria o mesmo resultado.
- **Recusar todo binário:** impediria as fixtures de planilha e desenho que as skills de obra precisam.
- **Tratar a varredura de termos como cerca:** prometeria uma garantia que ela não entrega.
