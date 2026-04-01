# Lattes2BibTex Parser Webtool

## Introdução
O Conselho Nacional de Pesquisa (CNPq) possui uma ferramenta chamada Plataforma Lattes, na qual os usuários inserem os dados e referências bibliográficas de sua produção técnica e científica realizadas em sua vida acadêmica e profissional. É obrigatório para os professores do ensino superior no Brasil e também para o acesso aos programas de pós-graduação stricto senso. 

Vários serviços online que integram pesquisas e pesquisadores de forma semelhante possuem integração bidirecional entre eles, ou seja, é possível exportar e importar diretamente seus dados, como no caso do ORCID (https://orcid.org) e ResearcherID (agora Web of Science) https://www.webofscience.com). 

A Plataforma Lattes consegue importar os dados do pesquisador provenientes do ResearcherID/WoS, mas não permite exportar esses dados. O export é feito em em um formato XML padrão nacional. O ResearcherID/WoS, por sua vez é conectado ao ORCID.

O serviço ORCID usa um arquivo to tipo BibTex para importar e exportar o conteúdo das referencias bibliográficas dos pesquisadores. E nós usaremos esse serviço e esse tipo de arquivo como intermediários entre a Plataforma Lattes e o ResearcherID/WoS.

## Porque isso é importante?
- Facilitar a integração entre a Plataforma Lattes e outros serviços de pesquisa, como ORCID e ResearcherID/WoS, permitindo que os pesquisadores possam facilmente exportar e importar seus dados bibliográficos, que podem chegar a milhares de referências, sem a necessidade de inserção manual.
- Promover a interoperabilidade entre diferentes plataformas de pesquisa, incentivando a colaboração e o compartilhamento de dados entre pesquisadores e instituições.
- Aumentar a visibilidade e o impacto da produção científica dos pesquisadores brasileiros, facilitando a disseminação de suas pesquisas em plataformas internacionais.

## Plano de Ação
- A primeira ação será criar um arquivo README.md objetivo e claro, contendo a descrição do projeto, os objetivos, o plano de ação e as instruções para uso do parser. Este arquivo servirá como guia para os usuários e colaboradores do projeto.
- Em seguida, crie um arquivo AGENTS.md, onde serão listados os agentes envolvidos no projeto, suas responsabilidades e contatos para comunicação.
- Elabore uma lista das SKILLS necessárias para o desenvolvimento do parser e organize-as na pasta `.codex/skills`, garantindo uma organização clara e eficiente do projeto.
- Use todos os MCP servers tools que forem necessários para o desenvolvimento do parser, garantindo que todas as etapas do processo sejam realizadas de forma eficiente e colaborativa.
- O repositório inicialmente será privado por conta da presença do meu próprio currículo, mas será tornado público assim que o parser estiver funcional e testado, para que outros pesquisadores possam utilizá-lo e contribuir com melhorias.
- Criaremos um parser que converta o formato XML da Plataforma Lattes para o formato BibTex, e vice-versa.
- O parser será implementado em Typescript, utilizando bibliotecas como `xml2js` para manipulação de XML e `bibtex-parse` para manipulação de BibTex.
- A interface do usuário será simples e intuitiva, criada em ReactJS, contendo inicialmente as sessões:
  - Header com o título do projeto e uma breve descrição dos objetivos do parser e as instruções de uso (onde fazer o download do arquivo XML da Plataforma Lattes, como usar o parser, e como fazer o upload do arquivo BibTex para o ORCID).
  - Seção principal com um campo para upload do arquivo XML da Plataforma Lattes e um botão para download do arquivo BibTex correspondente.
  - Footer com informações de contato e links para o repositório do projeto no GitHub e da Santa Catarina Laboratório de Pesquisas Avançadas e Inteligência Artificial (formerly [Cecil-IA Labs](https://cecilialabs.com)), licença, termos de uso, etc.
- O parser não deve utilizar nenhuma API externa ou cookies, garantindo a privacidade e segurança dos dados dos usuários.
- O parser será disponibilizado como um serviço web free, inicialmente hosted no GitHub Pages, e o código será open source, permitindo que os usuários façam upload de seus arquivos XML da Plataforma Lattes e obtenham os arquivos BibTex correspondentes.
  
## Initial Commit
No interior do respositório, você encontrará os arquivos básicos para iniciar o projeto, incluindo:
- **assets/LMPLCurriculo.DTD**
- **assets/xml_cvbase_src_main_resources_CurriculoLattes.xml** - Schema XML da Plataforma Lattes, que define a estrutura dos arquivos XML exportados pela plataforma.
- **repos-legacy/*.zip** - Arquivos zipados contendo antigos repositórios já desatualizados mas com propostas semelhantes, embora com complexidade muito alta para o usuário final, mas que podem ser utilizados como referência para o desenvolvimento do parser.
- **source/0645206667083920.xml** - Exemplo de arquivo XML exportado da Plataforma Lattes, contendo meu próprio currículo, que pode ser utilizado para testes e desenvolvimento do parser.
- **src/** - Pasta onde o código do parser será desenvolvido, incluindo a implementação do parser em Typescript e a interface em ReactJS.
- **README.md** - Este arquivo, que contém a descrição do projeto, objetivos, plano de ação e instruções para uso.

