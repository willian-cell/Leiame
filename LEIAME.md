# Livro Interativo Inovador com IA (Leiame)

Um sistema 100% brasileiro focado em proporcionar uma experiência majestosa de recomendação de leitura utilizando interface de vidro (glassmorphism), totalmente estético e inteligente!

Este sistema foi concebido de modo a combinar as habilidades de um Curador Literário com a mais recente tecnologia de Inteligência Artificial da API DeepSeek.

## Funcionalidades Incríveis

- **Livro Interativo Visual:** Suporte para paginação, onde as imagens fluem de maneira suave para proporcionar uma sensação imersiva de leitura. As páginas mudam sem travamentos entre os arquivos (`imagens/1.png` a `imagens/11.png`).
- **Design Estético Moderno:** Estilos desenvolvidos usando *Vanilla CSS*, contando com gradientes vívidos com o conceito de _Glassmorphism_ (efeitos profundos de vidro esfumaçado) e orbes envolventes para um visual de luxo.
- **Integração com Inteligência Artificial DeepSeek:** Uma secção única totalmente embutida com Javascript (com fetch direto na infraestrutura do navegador), que analisa com precisão as vontades do usuário e recomenda com exclusividade até 3 novos livros formidáveis.
- **Ecossistema Fechado de Exportação JSON:** Qualquer busca realizada pelo leitor pode ser transferida do armazenamento de curto-prazo da máquina para um modelo padrão aberto através do histórico sendo baixado via `historico_livros_ia.json`.

## Estrutura do Sistema

A aplicação foi moldada priorizando um conceito de _front-end_ (interface front-end nativa) simples e efetiva:

- **`index.html`**: A infraestrutura chave e os blocos que dividem a interface inteligente.
- **`style.css`**: Toda a estética visual (cores de fundo escuras, responsividade e layout flexível).
- **`script.js`**: Funções do livro, integração com a IA baseada em requisições seguras `async/await` com conexão API direta usando chaves, mais gestão do armazenamento interno (JSON/localStorage).
- **Trilha Sonora Cativante**: Uma integração em background com Youtube no mudo, ativável caso deseje fundo sonoro usando o IFrame incorporado.

## Como Rodar Naturalmente

Como a infraestrutura é front-end orgânico:

1. Basta clicar diretamente no arquivo `index.html` usando um navegador limpo de extensões obstrutivas (como Chrome, Firefox, Edge, ou Safari).
2. Escrever os seus gostos literários, clicar em 'Gerar Recomendações' e contemplar as mágicas opiniões da Inteligência Artificial em língua portuguesa nativa.

*Feito inteiramente focado na aula 6 do Curso de Inteligência Artificial para proporcionar o mais deslumbrante ecossistema digital.*
