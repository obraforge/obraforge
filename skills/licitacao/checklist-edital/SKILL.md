---
name: checklist-edital
description: Extrai de um edital de licitação de obra ou serviço de engenharia os itens obrigatórios de habilitação (jurídica, técnica, fiscal, social e trabalhista, econômico-financeira), as declarações e as exigências da proposta, conforme a Lei nº 14.133/2021, e devolve um checklist com a cláusula de origem de cada item, sinalizando exigência atípica. Use quando o usuário pedir o checklist, a lista de documentos ou os requisitos para participar de uma licitação a partir do edital.
metadata:
  obraforge-area: "licitacao"
  obraforge-fase: "1"
  obraforge-versao: "1.1.0"
---

# Checklist de edital

Transforma o edital de uma licitação de obra ou serviço de engenharia num checklist do que a
empresa precisa apresentar para participar, com a cláusula de origem de cada item. Serve ao setor de
licitação, ao engenheiro e ao administrativo que montam a documentação. A skill estrutura o que o
edital pede; ela não prepara os documentos nem dá parecer jurídico.

## Quando usar

- O usuário entrega um edital (texto, PDF ou trechos) e pede o checklist de documentos.
- O usuário pergunta o que precisa para participar de uma licitação, ou se esqueceu algum documento.
- O usuário quer saber se o edital tem alguma exigência fora do comum.

## O que fazer

1. **Leia o edital inteiro antes de listar.** Exigências de habilitação aparecem fora da seção de
   habilitação: nas condições de participação, na visita técnica, nas disposições gerais e nos
   anexos. Se o edital remete a um anexo que não foi fornecido, registre isso.
2. **Habilitação, nas quatro categorias do art. 62 da Lei nº 14.133/2021:** jurídica; técnica;
   fiscal, social e trabalhista; econômico-financeira. Cada exigência vai para uma categoria, com o
   número da cláusula do edital.
3. **Declarações** numa lista própria: por exemplo, a de que não emprega menor em situação proibida,
   a de cumprimento da reserva de cargos para pessoa com deficiência e reabilitado (art. 63, IV) e a
   de conhecimento do local quando a visita é facultativa ou substituível.
4. **Proposta:** o que o edital pede junto com o preço (planilha, composição do BDI e dos encargos,
   cronograma, prazo de validade, garantia de proposta).
5. **Nunca invente exigência.** O checklist traz só o que o edital pede. Não complete com
   documentos que "costumam" ser pedidos.
6. **Sinalize a exigência atípica**, com a cláusula e o motivo, como ponto a conferir com o jurídico
   da empresa, sem afirmar que ela é ilegal. Referências da Lei nº 14.133/2021 para essa conferência:
   - preferência ou distinção em razão da sede ou do domicílio do licitante (art. 9º, I, "b");
   - atestado com quantidade mínima acima de 50% da parcela de maior relevância, ou com limitação de
     tempo ou de local (art. 67, § 2º); parcela de maior relevância com valor abaixo de 4% do total
     estimado (art. 67, § 1º);
   - profissional que precisa estar vinculado à licitante já na abertura ou na entrega dos
     documentos: o art. 67, I pede o profissional "para fins de contratação";
   - faturamento mínimo, índice de rentabilidade ou de lucratividade (art. 69, § 2º); índice ou
     valor não usual (art. 69, § 5º); capital mínimo ou patrimônio líquido mínimo acima de 10% do
     valor estimado (art. 69, § 4º);
   - garantia de proposta acima de 1% do valor estimado (art. 58, § 1º).

   Uma exigência dentro desses limites não é atípica: não a sinalize. Se o edital exige quantidade
   mínima em atestado sem dizer a que parcela de maior relevância ela se refere, isso não é atípico
   por si só: registre em "Pontos a confirmar", porque os limites do art. 67 se medem pela parcela.

## Como responder

1. Uma linha com o objeto, o critério de julgamento e o valor estimado, se o edital trouxer.
2. O checklist em Markdown, com caixas de marcação, nesta ordem: habilitação jurídica; técnica;
   fiscal, social e trabalhista; econômico-financeira; declarações; proposta. Cada item com a
   cláusula entre parênteses, por exemplo "(item 6.3, b)".
3. "Exigências atípicas": cada uma com a cláusula, o que ela pede e a referência da lei a conferir.
4. "Pontos a confirmar": anexo não fornecido, cláusula ambígua ou contraditória.
5. O aviso do fim, sem alteração.

A skill não prepara nem confere os documentos da empresa, não decide se vale a pena participar e
não emite parecer jurídico. Se o usuário pedir isso, diga que está fora do que esta skill faz.

> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.
