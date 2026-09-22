---
name: validar-planilha-orcamentaria
description: Confere a estrutura de uma planilha orçamentária de obra — hierarquia da EAP, itens sem unidade ou quantidade, unidade incoerente com o serviço, totais que não fecham, ausência de BDI e de encargos sociais — e aponta cada problema com o item de origem. Use quando o usuário pedir para revisar, conferir ou validar um orçamento ou uma planilha de custos de obra.
metadata:
  obraforge-area: "orcamento"
  obraforge-fase: "1"
  obraforge-versao: "1.0.1"
---

# Validar planilha orçamentária

Confere a estrutura de uma planilha orçamentária de obra antes de ela seguir para aprovação,
proposta ou contrato. Serve a orçamentista, engenheiro e fiscal que precisam de uma segunda leitura
rápida e sistemática. A skill aponta o que está errado ou faltando; ela não refaz o orçamento.

## Quando usar

- O usuário pede para revisar, conferir, validar ou "dar uma olhada" num orçamento de obra.
- O usuário entrega uma planilha de custos (CSV, XLSX, tabela colada no chat) e pergunta se ela
  está consistente.
- Antes de enviar uma proposta, o usuário quer saber se a planilha fecha.

## O que conferir

Leia a planilha inteira antes de apontar qualquer coisa. Identifique as colunas de item, descrição,
unidade, quantidade, preço unitário e total, e as linhas de grupo, de subtotal e de total. Se a
planilha usar vírgula como separador decimal e ponto como separador de milhar, leia os números
nesse padrão.

1. **Hierarquia da EAP.** Todo item pertence a um grupo que existe na planilha, e o número do item
   começa pelo número do grupo (o item 2.3 fica dentro do grupo 2). Aponte item cujo número não
   corresponde ao grupo em que aparece, grupo que não existe, número repetido e salto na numeração.
2. **Unidade presente.** Toda linha de serviço tem unidade. Linha de grupo, subtotal e total não
   precisam de unidade.
3. **Unidade coerente com o serviço.** Volume (concreto, escavação, aterro, reaterro) em m³; área
   (alvenaria, forma, laje, revestimento, pintura, cobertura, piso) em m²; comprimento (rufo, calha,
   tubulação, verga, rodapé) em m; aço em kg; peça contável em un; verba (vb) só quando a descrição
   justifica. Aponte a unidade que não combina com o serviço descrito e diga qual seria a esperada.
4. **Quantidade.** Toda linha de serviço tem quantidade maior que zero. Quantidade zero ou vazia em
   item com preço unitário é apontada, mesmo que o total da linha seja zero.
5. **Total do item.** O total da linha é a quantidade vezes o preço unitário. Diferença de
   arredondamento de centavos (até R$ 0,01 por linha) **não é erro** e não deve ser apontada.
6. **Subtotais e total geral.** Cada subtotal é a soma dos itens listados sob o grupo, na ordem da
   planilha, inclusive um item mal numerado (que já é apontado na hierarquia, sem virar um segundo
   erro de soma); o total é a soma dos subtotais. Aponte o subtotal que não fecha com o valor encontrado, o valor calculado e a
   diferença. Se o total geral só herda a diferença de um subtotal, diga isso em vez de contar um
   erro novo.
7. **BDI.** Existe uma linha ou um percentual de BDI aplicado sobre o custo direto, ou a planilha
   declara que os preços unitários já incluem o BDI. Se o preço final é igual ao custo direto sem
   nenhuma menção a BDI, aponte a ausência.
8. **Encargos sociais.** A planilha declara o percentual de encargos sociais sobre a mão de obra
   (e a base: horista ou mensalista, com ou sem desoneração), ou declara que os preços já os
   incluem. Se não houver nenhuma dessas informações, aponte a ausência.

## Como responder

1. Uma linha de resumo: quantos problemas foram encontrados e em quais categorias.
2. Uma lista numerada dos problemas, na ordem da planilha. Para cada um: o item (número e
   descrição), a categoria da lista acima, o que foi encontrado e o que se esperava.
3. Uma seção curta "Conferido e sem problema", com as categorias que passaram, para o usuário saber
   o que foi olhado.
4. O aviso do fim, sem alteração.

A skill não confere se o preço está compatível com o mercado ou com uma base de referência, não
confere quantitativos contra o projeto e não corrige nem gera a planilha. Se o usuário pedir isso,
diga que está fora do que esta skill faz.

> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.
