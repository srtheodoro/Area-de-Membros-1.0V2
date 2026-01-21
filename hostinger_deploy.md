# Guia de Deploy na Hostinger (Node.js + React)

Este guia cobre o deploy em planos de Hospedagem Compartilhada ou Cloud da Hostinger que possuem o recurso **"Setup Node.js App"**.

## 1. Preparação do Banco de Dados (Supabase)
Antes de tudo, seu banco de dados precisa estar pronto.
1. Acesse o **SQL Editor** do seu projeto Supabase.
2. Copie e execute todo o conteúdo do arquivo `supabase_schema.sql` deste repositório.
3. Vá em **Project Settings > API**. Copie:
   - Project URL
   - `anon` public key
   - `service_role` secret key (Necessária para a área administrativa).

## 2. Configuração Inicial na Hostinger
1. Acesse o hPanel e vá para a seção **"Websites" > "Gerenciar"**.
2. No menu lateral, procure por **"Setup Node.js App"** (geralmente em "Avançado").
3. Clique em **"Criar Nova Aplicação"** (ou configure a existente) com estes dados:
   - **Node.js Version:** Selecione **v20** (LTS).
   - **Application Mode:** Production.
   - **Application Root:** Deixe como está (geralmente `domains/seudominio.com/public_html` ou apenas `/`).
   - **Application Startup File:** `server/index.js` (Isso é crucial).
4. Clique em **Criar**.

## 3. Conectando o Git
1. O recurso Node.js App não puxa o código automaticamente na criação. Você tem duas opções:
   - **Opção A (Recomendada):** Usar o recurso **"Git"** do painel da Hostinger para clonar este repositório dentro da pasta raiz da aplicação.
   - **Opção B:** Fazer upload manual do ZIP via Gerenciador de Arquivos (extraia tudo na raiz).

## 4. Variáveis de Ambiente (.env)
A Hostinger tem uma interface de variáveis, mas para o build do React (Vite), é mais seguro criar um arquivo `.env` físico na raiz, pois o Vite precisa das variáveis *durante o processo de build*.

1. Abra o **Gerenciador de Arquivos** ou conecte via **SSH**.
2. Na raiz da aplicação, crie um arquivo chamado `.env`.
3. Cole o conteúdo abaixo (substituindo pelos seus dados):

```env
# Configuração do Servidor
PORT=3000
NODE_ENV=production

# Supabase (Backend & Frontend)
VITE_SUPABASE_URL=https://sua-url-supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta

# E-mail (Opcional - Se não configurar, veja os logs do console)
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_USER=no-reply@seudominio.com
SMTP_PASS=sua-senha
SMTP_FROM="EAD Plataforma <no-reply@seudominio.com>"

# Customização
SITE_NAME="Minha Plataforma EAD"
```

## 5. Instalação e Build (Via SSH)
A interface gráfica "NPM Install" da Hostinger muitas vezes falha com estruturas de pastas aninhadas (`client/`). **Use o Terminal SSH** para garantir o sucesso.

1. Conecte-se ao SSH da sua conta (Dados em "Acesso SSH" no painel).
2. Navegue até a pasta da aplicação:
   ```bash
   cd domains/seudominio.com/public_html
   ```
3. Instale as dependências da raiz (backend):
   ```bash
   npm install
   ```
4. Instale e faça o build do Frontend:
   *Este comando mágico está configurado no seu `package.json` raiz:*
   ```bash
   npm run build
   ```
   *O que isso faz?* Entra na pasta `client`, instala dependências do React e roda o Vite para gerar a pasta `client/dist`.

5. Verifique se a pasta `dist` foi criada:
   ```bash
   ls client/dist
   # Deve listar index.html, assets, etc.
   ```

## 6. Finalizando e Iniciando
1. Volte ao painel **"Setup Node.js App"** na Hostinger.
2. Clique no botão **"Restart"** (Reiniciar).
3. Aguarde alguns segundos e acesse sua URL.

## 7. Troubleshooting (Diagnóstico de Erros)

### Tela Branca (White Screen of Death)
- **Causa provável:** O Frontend (React) não conseguiu ler as variáveis de ambiente durante o build ou o servidor não está servindo a pasta `dist`.
- **Solução:**
  1. No navegador, abra o Console (F12). Se vir erros 404 para arquivos `.js` ou `.css`, o caminho estático está errado.
  2. Se vir erros como `Missing Supabase Variables`, você fez o build sem o arquivo `.env` presente ou com nomes de variáveis errados. Recrie o `.env` e rode `npm run build` novamente via SSH.

### Erro 404 ao Recarregar Página Interna
- **Causa:** O servidor Express não está redirecionando rotas desconhecidas para o `index.html` (SPA Routing).
- **Verificação:** O código `server/index.js` já possui a linha `app.get('*', ...)` que corrige isso. Certifique-se de ter reiniciado a aplicação após atualizar o código.

### "Application Error" ou Site fora do ar
- **Diagnóstico:**
  1. Vá ao painel Node.js na Hostinger.
  2. Ative o botão **"Logs"** ou clique em **"Output.log"** / **"Error.log"**.
  3. Erro comum: `Error: Cannot find module '...'`. Significa que você esqueceu de rodar `npm install`.
  4. Erro comum: `EADDRINUSE`. A Hostinger gerencia a porta automaticamente, mas certifique-se de que seu código usa `process.env.PORT`.

### Atualizações Futuras
Sempre que você enviar código novo para o GitHub:
1. No painel Hostinger (Git), clique em **"Deploy"** (ou faça `git pull` via SSH).
2. Se mudou algo no Frontend, rode via SSH: `npm run build`.
3. Reinicie a aplicação no painel Node.js.
