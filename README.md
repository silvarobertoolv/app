# 🌱 Cobrinha no Jardim

Jogo infantil em português brasileiro, feito com React Native e Expo para iOS, com versão web para desenvolvimento. Guie a Lili pelo jardim, colete frutas e descubra novos caminhos.

## Desenvolvimento

Use Node.js 22.13+ ou 24.3+ e npm.

```sh
npm ci
npm start
```

No iPhone, abra o projeto com o Expo Go compatível com o SDK 58, na mesma rede do computador. Para usar o simulador, execute `npm run ios` em um Mac com Xcode. Em redes que bloqueiam o acesso entre dispositivos, use um development build ou configure o acesso conforme a documentação do Expo.

```sh
npm run web       # Versão web
npm test          # Regras do jogo
npm run typecheck
npm run build:web

# Testes da interface no navegador
npx playwright install chromium
npm run test:e2e
```

Em Linux com Chromium já instalado, é possível executar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` sem baixar outro navegador.

## Como brincar

- Toque em **Vamos jogar!** e guie a cobrinha pelas setas na tela ou deslizando o dedo no jardim.
- No computador, use as setas ou WASD; espaço pausa e continua.
- Cada fruta vale um ponto e aumenta a cobrinha. Evite as bordas e seu próprio corpo.
- Escolha entre Tranquilinho, Aventureiro e Foguete antes de iniciar uma partida.
- O botão de som permite desligar as melodias. No iPhone, o modo silencioso é respeitado.
- Recorde, som e velocidade são salvos apenas no dispositivo. Sem anúncios, cadastro ou serviços externos do jogo.
- Ao sair do app, a partida pausa automaticamente.

## Build para iOS

O ambiente Linux valida a lógica e a versão web; não oferece Xcode nem simulador iOS. A validação em um iPhone continua necessária, incluindo áudio, gestos e áreas seguras.

Em um Mac com Xcode, `npx expo run:ios` gera e executa o projeto nativo. Para um binário assinado pelo serviço Expo, instale a CLI EAS, autentique-se e execute `eas build --platform ios --profile preview`. O perfil `preview` usa distribuição interna e requer o registro do aparelho. Para App Store/TestFlight, use o perfil `production`. É necessário configurar um projeto Expo, um identificador de app disponível e as credenciais da conta Apple Developer. O identificador inicial pode ser alterado em `app.json`.

Não há binário iOS assinado ou publicação na App Store incluídos neste repositório.

## Estrutura

- `App.tsx`: interface responsiva, controles, áudio e persistência local.
- `src/game.js`: regras puras do jogo, sem dependências da interface.
- `tests/game.test.js`: testes de movimento, comida, colisões, pausa e vitória.
- `assets/sounds/`: melodias originais sintetizadas, incluídas offline.
- `e2e/`: testes de interação no navegador.

Os sons não usam microfone. As permissões de gravação são desativadas na configuração do plugin de áudio.
