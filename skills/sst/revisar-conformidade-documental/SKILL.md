---
name: revisar-conformidade-documental
description: Confere a lista de documentos de uma obra contra um checklist genérico (PGR, PCMSO, ART ou RRT de execução, alvará de construção, memorial descritivo e projeto aprovado), com a NR ou a lei de cada um, e aponta o que falta e o que está vencido numa data de referência. Use quando o usuário pedir para revisar, auditar ou conferir a documentação legal ou de segurança de uma obra.
metadata:
  obraforge-area: "sst"
  obraforge-fase: "1"
  obraforge-versao: "1.0.0"
---

# Revisar conformidade documental

Confere se os documentos básicos de uma obra existem e estão no prazo, a partir da lista que o
usuário fornece. Serve ao técnico e ao engenheiro de segurança, ao engenheiro de obra e ao
administrativo que preparam a obra para uma fiscalização ou uma auditoria. A skill diz o que falta e
o que venceu; ela não avalia se o conteúdo técnico de cada documento está adequado.

## Quando usar

- O usuário entrega a lista de documentos de uma obra (tabela, planilha, texto) e pede para conferir.
- O usuário pergunta se a obra está com a documentação em dia antes de uma fiscalização.
- O usuário quer saber o que falta para começar ou continuar uma obra.

## Data de referência

Tudo que vence é comparado com uma **data de referência**. Use a que o usuário ou a lista informar.
Se nenhuma for informada, pergunte; se o usuário não souber, use a data de hoje e diga isso no início
da resposta.

## O que conferir

Para cada documento do checklist, diga se está **presente**, **faltante**, **vencido** ou **a
confirmar** (quando a lista não traz informação suficiente).

1. **PGR — Programa de Gerenciamento de Riscos.** A NR-1 exige que o gerenciamento de riscos
   ocupacionais constitua um PGR, com no mínimo o inventário de riscos e o plano de ação. A NR-18
   torna o PGR obrigatório nos canteiros de obras e exige que ele seja elaborado por profissional
   legalmente habilitado em segurança do trabalho; em canteiro com até 7 m de altura e no máximo 10
   trabalhadores, pode ser elaborado por profissional qualificado. **Vencido:** a NR-1 manda rever a
   avaliação de riscos a cada dois anos (até três anos para organização com certificação em sistema
   de gestão de SST), além das revisões por mudança. Use a data de revisão que o documento declara;
   se ele não declarar, conte dois anos a partir da emissão e registre que a revisão foi estimada.
2. **PCMSO — Programa de Controle Médico de Saúde Ocupacional (NR-7).** O médico responsável
   elabora o relatório analítico do programa anualmente. **Vencido:** relatório analítico com mais
   de um ano na data de referência, quando a lista trouxer a data dele; sem a data, marque a
   confirmar.
3. **ART ou RRT de execução da obra.** A ART vem da Lei nº 6.496/1977 (engenharia) e o RRT da Lei
   nº 12.378/2010 (arquitetura e urbanismo). A ART ou o RRT **de projeto** não substitui o de
   **execução**: sem o de execução, aponte como faltante.
4. **Alvará de construção.** É emitido pelo município, conforme o código de obras local. **Vencido:**
   validade anterior à data de referência.
5. **Memorial descritivo.** Presente ou faltante.
6. **Projeto aprovado.** O projeto precisa estar aprovado pela prefeitura. Projeto "para execução"
   sem registro de aprovação não conta como aprovado: aponte como faltante ou a confirmar.

Documento da lista que não faz parte do checklist é mencionado ao final, sem julgamento.

## Como responder

1. A data de referência usada.
2. Uma tabela: documento, situação, base (NR ou lei), observação (validade, revisão, o que falta).
3. "Pendências", em ordem de urgência: faltantes primeiro, depois vencidos, depois a confirmar.
4. O aviso do fim, sem alteração.

A skill não avalia se o PGR, o PCMSO ou o projeto estão tecnicamente corretos, não emite nem
preenche documento e não substitui a fiscalização. Se o usuário pedir isso, diga que está fora do
que esta skill faz.

> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.
