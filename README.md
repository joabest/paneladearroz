# Panela de Arroz — revisão privada

Site estático restaurado a partir de `paneladearroz-site.zip`, da captura original `saveweb2zip-com-www-zema-com.zip` e dos quatro prints enviados em 08/10/2026.

`index.html` mantém a estrutura e o conteúdo originais. `original.css` conserva a cascata de estilos da captura. `restoration.css` corrige os tamanhos fixos e recompõe as posições vistas no mobile. `app.js` implementa galeria, navegação, acordeões, favoritos, seleção de voltagem, sacola local e diálogos sem dependências externas.

As imagens e fontes originais foram preservadas byte a byte. Dois ícones ausentes foram recompostos em SVG. O selo Reclame Aqui e o ícone de ajuda foram extraídos dos prints fornecidos. Os destinos que haviam sido substituídos por `#` foram recuperados dos dados da captura original; páginas fora deste projeto continuam apontando para sua origem.

## Validação

Sintaxe JavaScript, caminhos de recursos, unicidade de IDs, referências ARIA e preservação das imagens foram conferidos. Os testes da lógica cobrem estado salvo inválido, limite de estoque, inclusão repetida na sacola, voltagem indisponível, valores e CEP. O ambiente não dispõe do navegador de QA, portanto os testes visuais e a operação completa em desktop e mobile permanecem pendentes.

## Serviços ausentes no material

O ZIP não contém backend de checkout, autenticação, estoque ao vivo ou transportadora. A sacola e os favoritos persistem neste navegador. Nenhuma cobrança ou pedido é criado, e não são inventadas tarifas ou prazos de entrega. Preços, estoque e avaliações representam exclusivamente o material recebido, sem consulta em tempo real.

## Revisão no GitHub

Esta branch contém os arquivos estáticos completos, sem depender dos pacotes Base64 ou dos workflows de importação da versão anterior. Não é necessário instalar dependências nem executar build: sirva este diretório como arquivos estáticos.

O arquivo `vercel.json` inclui `git.deploymentEnabled: false` para impedir deploy automático enquanto a revisão aguarda aprovação. Não mescle esta branch nem publique na Vercel antes de autorizar a publicação.

Prévia privada para conferência: https://panela-de-arroz-revisao.cool-nova-2906.chatgpt.site

