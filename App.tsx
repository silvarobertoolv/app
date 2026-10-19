import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import { advance, canTurn, newGame, SIZE, SPEEDS } from "./src/game";

type Direction = "up" | "down" | "left" | "right";
type Speed = keyof typeof SPEEDS;
const C = {
  ink: "#203F35",
  green: "#247B50",
  dark: "#164F36",
  mint: "#EDF5ED",
  muted: "#708177",
  line: "#DBE7DA",
  yellow: "#FFE8A0",
};
const FRUITS = ["🍎", "🍓", "🍊", "🍒", "🍐"];
function Label({ children, style, ...props }: any) {
  return (
    <Text {...props} style={[s.text, style]}>
      {children}
    </Text>
  );
}
function Mascot({ small = false }: { small?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="Uma cobrinha verde sorridente"
      style={[
        s.mascot,
        small && { transform: [{ scale: 0.68 }], marginVertical: -16 },
      ]}
    >
      <View style={s.tail} />
      <View style={s.body} />
      <View style={s.head}>
        <View style={s.eyes}>
          <View style={s.eye}>
            <View style={s.pupil} />
          </View>
          <View style={s.eye}>
            <View style={s.pupil} />
          </View>
        </View>
        <View style={s.cheek} />
        <View style={s.smile} />
      </View>
      <Label style={s.leaf}>✦</Label>
    </View>
  );
}
function Button({ children, onPress, secondary = false, style, label }: any) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        secondary ? s.secondary : s.primary,
        style,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Label style={[s.buttonText, secondary && { color: C.green }]}>
        {children}
      </Label>
    </Pressable>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const boardSize = Math.min(wide ? 472 : width - 68, 472);
  const cell = boardSize / SIZE;
  const [game, setGame] = useState(newGame);
  const [speed, setSpeed] = useState<Speed>("tranquilinho");
  const [sound, setSound] = useState(true);
  const [best, setBest] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const [help, setHelp] = useState(false);
  const gameRef = useRef(game);
  gameRef.current = game;
  const queued = useRef<Direction | null>(null);
  const eatAudio = useAudioPlayer(require("./assets/sounds/eat.wav"));
  const startAudio = useAudioPlayer(require("./assets/sounds/start.wav"));
  const endAudio = useAudioPlayer(require("./assets/sounds/end.wav"));
  const play = useCallback(
    (player: typeof eatAudio) => {
      if (sound) {
        void player
          .seekTo(0)
          .then(() => player.play())
          .catch(() => {});
      }
    },
    [sound],
  );
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
    AsyncStorage.multiGet(["garden.best", "garden.sound", "garden.speed"])
      .then((values) => {
        const prefs = Object.fromEntries(values);
        setBest(Number(prefs["garden.best"]) || 0);
        setSound(prefs["garden.sound"] !== "off");
        if (prefs["garden.speed"] && prefs["garden.speed"] in SPEEDS)
          setSpeed(prefs["garden.speed"] as Speed);
      })
      .catch(() => {})
      .finally(() => setStorageReady(true));
  }, []);
  useEffect(() => {
    if (storageReady)
      void AsyncStorage.multiSet([
        ["garden.best", String(best)],
        ["garden.sound", sound ? "on" : "off"],
        ["garden.speed", speed],
      ]).catch(() => {});
  }, [best, sound, speed, storageReady]);
  const turn = useCallback((direction: Direction) => {
    const g = gameRef.current;
    if (
      g.status === "playing" &&
      !queued.current &&
      canTurn(g.direction, direction) &&
      g.direction !== direction
    )
      queued.current = direction;
  }, []);
  const pause = useCallback(() => {
    setGame((g) =>
      g.status === "playing"
        ? { ...g, status: "paused" }
        : g.status === "paused"
          ? { ...g, status: "playing" }
          : g,
    );
  }, []);
  useEffect(() => {
    if (game.status !== "playing") return;
    const timer = setInterval(() => {
      setGame((g) => {
        const next = advance(g, queued.current || g.direction);
        queued.current = null;
        return next;
      });
    }, SPEEDS[speed]);
    return () => clearInterval(timer);
  }, [game.status, speed]);
  const prev = useRef({ score: 0, status: "ready" });
  useEffect(() => {
    if (game.score > prev.current.score) play(eatAudio);
    if (
      (game.status === "over" || game.status === "won") &&
      prev.current.status === "playing"
    )
      play(endAudio);
    prev.current = { score: game.score, status: game.status };
    if (game.score > best) setBest(game.score);
  }, [game.score, game.status, best, play, eatAudio, endAudio]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active")
        setGame((g) =>
          g.status === "playing" ? { ...g, status: "paused" } : g,
        );
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const doc = (globalThis as any).document;
    doc.documentElement.lang = "pt-BR";
    doc.title = "Cobrinha no Jardim • Vamos brincar!";
    const listener = (event: any) => {
      if (help) return;
      const keys: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      if (keys[event.key]) {
        event.preventDefault();
        turn(keys[event.key]);
      }
      if (event.code === "Space") {
        event.preventDefault();
        pause();
      }
    };
    const hidden = () => {
      if (doc.hidden)
        setGame((g) =>
          g.status === "playing" ? { ...g, status: "paused" } : g,
        );
    };
    globalThis.addEventListener("keydown", listener);
    doc.addEventListener("visibilitychange", hidden);
    return () => {
      globalThis.removeEventListener("keydown", listener);
      doc.removeEventListener("visibilitychange", hidden);
    };
  }, [turn, pause, help]);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => gameRef.current.status === "playing",
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) + Math.abs(g.dy) > 12,
      onPanResponderRelease: (_, g) => {
        if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) < 12) return;
        turn(
          Math.abs(g.dx) > Math.abs(g.dy)
            ? g.dx > 0
              ? "right"
              : "left"
            : g.dy > 0
              ? "down"
              : "up",
        );
      },
    }),
  ).current;
  const start = () => {
    queued.current = null;
    setGame({ ...newGame(), status: "playing" });
    play(startAudio);
  };
  const showHelp = () => {
    setGame((g) => (g.status === "playing" ? { ...g, status: "paused" } : g));
    setHelp(true);
  };
  const active = game.status === "playing" || game.status === "paused";
  const directionRotation = {
    right: "0deg",
    down: "90deg",
    left: "180deg",
    up: "270deg",
  } as const;
  const howto = (
    <View style={s.howCard}>
      <View style={s.cardHeading}>
        <View style={s.iconTile}>
          <Label style={{ fontSize: 21 }}>☀</Label>
        </View>
        <Label style={s.cardTitle}>
          {"Pequenos passos,\ngrandes aventuras!"}
        </Label>
      </View>
      <Label style={s.cardIntro}>É fácil brincar. Olha só:</Label>
      {[
        ["1", "Guie sua cobrinha", "Use as setas ou deslize o dedo no jardim."],
        [
          "2",
          "Hora do lanchinho!",
          "Pegue as frutinhas para crescer e ganhar pontos.",
        ],
        ["3", "Cuidado no caminho", "Evite as bordas e o próprio corpinho."],
      ].map(([n, title, body]) => (
        <View key={n} style={s.step}>
          <View
            style={[
              s.number,
              n === "2" && { backgroundColor: "#FDEAC4" },
              n === "3" && { backgroundColor: "#E9E1F7" },
            ]}
          >
            <Label style={s.numberText}>{n}</Label>
          </View>
          <View style={{ flex: 1 }}>
            <Label style={s.stepTitle}>{title}</Label>
            <Label style={s.stepBody}>{body}</Label>
          </View>
        </View>
      ))}
      <View style={s.kindNote}>
        <Label style={{ fontSize: 20 }}>♡</Label>
        <Label style={s.kindText}>
          {
            "Aqui, o importante é se divertir.\nVocê pode tentar quantas vezes quiser!"
          }
        </Label>
      </View>
    </View>
  );
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.nav}>
            <View style={s.brand}>
              <View style={s.brandIcon}>
                <Label
                  style={{ color: "white", fontSize: 25, fontWeight: "900" }}
                >
                  〰
                </Label>
              </View>
              <View>
                <Label style={s.brandName}>jardim de brincar</Label>
                <Label style={s.brandSub}>UM MUNDO DE DESCOBERTAS</Label>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={showHelp}
              style={s.helpButton}
            >
              <Label style={s.helpButtonText}>? Como jogar</Label>
            </Pressable>
          </View>
          {(wide || game.status === "ready") && (
            <View style={s.hero}>
              <View style={s.eyebrow}>
                <View style={s.dot} />
                <Label style={s.eyebrowText}>APRENDER BRINCANDO</Label>
              </View>
              <Label
                accessibilityRole="header"
                style={[s.title, !wide && { fontSize: 36 }]}
              >
                Cobrinha no <Text style={{ color: C.green }}>Jardim</Text>
                <Text style={{ fontSize: wide ? 34 : 28 }}> 🌱</Text>
              </Label>
              <Label style={s.subtitle}>
                Uma pequena cobrinha. Uma grande aventura!
              </Label>
            </View>
          )}
          <View
            style={[
              s.columns,
              !wide && { flexDirection: "column", alignItems: "stretch" },
            ]}
          >
            <View style={[s.gameCard, !wide && { width: "100%" }]}>
              <View style={s.scoreRow}>
                <View style={s.scoreItem}>
                  <View style={[s.scoreIcon, { backgroundColor: "#FFF0DE" }]}>
                    <Label style={{ fontSize: 22 }}>🍎</Label>
                  </View>
                  <View>
                    <Label style={s.scoreLabel}>FRUTINHAS</Label>
                    <Label style={s.scoreValue}>
                      {String(game.score).padStart(2, "0")}
                    </Label>
                  </View>
                </View>
                <View style={s.scoreDivider} />
                <View style={s.scoreItem}>
                  <View style={[s.scoreIcon, { backgroundColor: "#FFF6D6" }]}>
                    <Label style={{ fontSize: 22 }}>🏆</Label>
                  </View>
                  <View>
                    <Label style={s.scoreLabel}>SEU RECORDE</Label>
                    <Label style={s.scoreValue}>
                      {String(best).padStart(2, "0")}
                    </Label>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={sound ? "Desligar som" : "Ligar som"}
                  accessibilityState={{ selected: sound }}
                  onPress={() => setSound((v) => !v)}
                  style={s.soundButton}
                >
                  <Label style={{ fontSize: 23 }}>{sound ? "🔊" : "🔇"}</Label>
                </Pressable>
              </View>
              <View style={s.gardenLabel}>
                <Label style={s.gardenLabelText}>
                  ✿ SEU JARDIM DE AVENTURAS
                </Label>
                <Pressable
                  disabled={!active}
                  accessibilityRole="button"
                  accessibilityLabel={
                    game.status === "paused" ? "Continuar jogo" : "Pausar jogo"
                  }
                  onPress={pause}
                  style={[s.pause, !active && { opacity: 0.45 }]}
                >
                  <Label style={s.pauseText}>
                    {game.status === "paused" ? "▶ Continuar" : "Ⅱ Pausar"}
                  </Label>
                </Pressable>
              </View>
              <View
                style={[s.board, { width: boardSize, height: boardSize }]}
                {...pan.panHandlers}
                accessibilityLabel={`Jardim do jogo. ${game.score} frutinhas.`}
              >
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {Array.from({ length: SIZE }, (_, y) => (
                    <View
                      key={y}
                      style={{ flexDirection: "row", height: cell }}
                    >
                      {Array.from({ length: SIZE }, (_, x) => (
                        <View
                          key={x}
                          style={{
                            width: cell,
                            height: cell,
                            backgroundColor:
                              (x + y) % 2 === 0 ? "#E5EFCB" : "#EAF2D5",
                          }}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                {game.food && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: game.food.x * cell,
                      top: game.food.y * cell,
                      width: cell,
                      height: cell,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Label style={{ fontSize: cell * 0.8, lineHeight: cell }}>
                      {FRUITS[game.score % FRUITS.length]}
                    </Label>
                  </View>
                )}
                {game.snake.map((p: any, i: number) => (
                  <View
                    pointerEvents="none"
                    key={i}
                    style={{
                      position: "absolute",
                      left: p.x * cell + 1,
                      top: p.y * cell + 1,
                      width: cell - 2,
                      height: cell - 2,
                      borderRadius: i === 0 ? cell * 0.38 : cell * 0.32,
                      backgroundColor:
                        i === 0 ? "#2E794A" : i % 2 ? "#65A453" : "#78B25C",
                      transform:
                        i === 0
                          ? [
                              {
                                rotate:
                                  directionRotation[
                                    game.direction as Direction
                                  ],
                              },
                            ]
                          : [],
                      zIndex: i === 0 ? 2 : 1,
                    }}
                  >
                    {i === 0 && (
                      <>
                        <View style={[s.snakeEye, { top: cell * 0.13 }]}>
                          <View style={s.snakePupil} />
                        </View>
                        <View style={[s.snakeEye, { bottom: cell * 0.13 }]}>
                          <View style={s.snakePupil} />
                        </View>
                      </>
                    )}
                  </View>
                ))}
                {game.status !== "playing" && (
                  <View style={s.boardVeil}>
                    <View
                      style={[
                        s.welcome,
                        { width: Math.min(boardSize - 28, 320) },
                      ]}
                    >
                      {game.status === "ready" || game.status === "paused" ? (
                        <Mascot small={boardSize < 350} />
                      ) : (
                        <Label style={{ fontSize: 52, marginBottom: 8 }}>
                          {game.status === "won" ? "🌟" : "🌷"}
                        </Label>
                      )}
                      <Label accessibilityRole="header" style={s.welcomeTitle}>
                        {game.status === "ready"
                          ? "Oi, vamos brincar?"
                          : game.status === "paused"
                            ? "Uma pausinha!"
                            : game.status === "won"
                              ? "Que jardim incrível!"
                              : "Boa aventura!"}
                      </Label>
                      <Label style={s.welcomeBody}>
                        {game.status === "ready"
                          ? "A Lili está com fome de aventura.\nAjude-a a encontrar as frutinhas!"
                          : game.status === "paused"
                            ? "A Lili espera por você.\nContinue quando estiver pronto."
                            : `Você pegou ${game.score} ${game.score === 1 ? "frutinha" : "frutinhas"}!\nQue tal descobrir um novo caminho?`}
                      </Label>
                      <Button
                        onPress={game.status === "paused" ? pause : start}
                        style={{ width: "100%", marginTop: 18 }}
                      >
                        {game.status === "paused"
                          ? "▶  Continuar"
                          : game.status === "ready"
                            ? "▶  Vamos jogar!"
                            : "↻  Brincar de novo"}
                      </Button>
                    </View>
                  </View>
                )}
              </View>
              <View style={s.belowBoard}>
                <Label style={s.hint}>☝ Deslize o dedo ou use as setas</Label>
                <View style={s.livePill}>
                  <View
                    style={[
                      s.dot,
                      {
                        width: 5,
                        height: 5,
                        backgroundColor:
                          game.status === "playing" ? "#6D9D43" : "#A3B18A",
                      },
                    ]}
                  />
                  <Label style={s.liveText}>
                    {game.status === "playing"
                      ? "Brincando"
                      : game.status === "paused"
                        ? "Em pausa"
                        : "Vamos brincar?"}
                  </Label>
                </View>
              </View>
              <View style={s.controls}>
                <View style={s.controlIntro}>
                  <Label style={s.controlTitle}>Por onde vamos?</Label>
                  <Label style={s.controlSub}>Um toque, uma direção.</Label>
                </View>
                <View style={s.dpad}>
                  <View style={{ alignItems: "center" }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Ir para cima"
                      onPress={() => turn("up")}
                      style={({ pressed }) => [
                        s.arrow,
                        pressed && s.arrowPressed,
                      ]}
                    >
                      <Label style={s.arrowText}>↑</Label>
                    </Pressable>
                    <View
                      style={{ flexDirection: "row", gap: 6, marginTop: 6 }}
                    >
                      {(["left", "down", "right"] as Direction[]).map(
                        (d, i) => (
                          <Pressable
                            key={d}
                            accessibilityRole="button"
                            accessibilityLabel={`Ir para ${["esquerda", "baixo", "direita"][i]}`}
                            onPress={() => turn(d)}
                            style={({ pressed }) => [
                              s.arrow,
                              pressed && s.arrowPressed,
                            ]}
                          >
                            <Label style={s.arrowText}>
                              {["←", "↓", "→"][i]}
                            </Label>
                          </Pressable>
                        ),
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
            <View style={[s.aside, !wide && { width: "100%" }]}>
              {howto}
              <View style={s.speedCard}>
                <Label style={s.cardTitle}>Cada um no seu ritmo</Label>
                <Label style={s.cardIntro}>
                  Escolha a velocidade da diversão.
                </Label>
                {(
                  [
                    [
                      "tranquilinho",
                      "🐢",
                      "Tranquilinho",
                      "Um passinho de cada vez",
                    ],
                    [
                      "aventureiro",
                      "🐇",
                      "Aventureiro",
                      "Para quem já pegou o jeito",
                    ],
                    ["foguete", "🚀", "Foguete", "Uma aventura rapidinha!"],
                  ] as const
                ).map(([key, emoji, title, sub]) => (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: speed === key,
                      disabled: active,
                    }}
                    accessibilityLabel={`${title}. ${sub}`}
                    disabled={active}
                    onPress={() => setSpeed(key)}
                    style={[
                      s.speedOption,
                      speed === key && s.speedSelected,
                      active && { opacity: 0.7 },
                    ]}
                  >
                    <Label style={{ fontSize: 27 }}>{emoji}</Label>
                    <View style={{ flex: 1 }}>
                      <Label style={s.speedTitle}>{title}</Label>
                      <Label style={s.speedSubtitle}>{sub}</Label>
                    </View>
                    <View
                      style={[
                        s.radio,
                        speed === key && { borderColor: C.green },
                      ]}
                    >
                      {speed === key && <View style={s.radioInner} />}
                    </View>
                  </Pressable>
                ))}
                {active && (
                  <Label style={s.speedNotice}>
                    Você pode mudar o ritmo na próxima partida.
                  </Label>
                )}
              </View>
              <View style={s.encourage}>
                <Label style={{ fontSize: 29 }}>🌼</Label>
                <View style={{ flex: 1 }}>
                  <Label style={s.encourageTitle}>
                    Crescer é uma aventura.
                  </Label>
                  <Label style={s.encourageBody}>
                    E cada tentativa é uma descoberta!
                  </Label>
                </View>
              </View>
            </View>
          </View>
          <View style={s.footer}>
            <Label style={s.footerText}>FEITO PARA PEQUENOS EXPLORADORES</Label>
            <Label style={s.footerNote}>
              Sem anúncios. Só diversão e descobertas. ♡
            </Label>
          </View>
        </ScrollView>
        <Modal
          visible={help}
          transparent
          animationType="fade"
          onRequestClose={() => setHelp(false)}
        >
          <View style={s.modalBackdrop}>
            <ScrollView contentContainerStyle={s.modalScroll}>
              <View accessibilityViewIsModal style={s.modalCard}>
                <Label style={s.modalTitle}>Vamos conhecer a Lili? 🌱</Label>
                {howto}
                <Label style={s.modalNote}>
                  No computador, use as setas do teclado. A barra de espaço
                  pausa ou continua a partida. No iPhone, deslize no jardim ou
                  toque nas setas. O botão de som liga e desliga as melodias.
                </Label>
                <Button onPress={() => setHelp(false)}>
                  Entendi, vamos lá!
                </Button>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8F1" },
  text: {
    color: C.ink,
    fontFamily:
      Platform.OS === "ios"
        ? "Avenir Next"
        : Platform.OS === "web"
          ? '"Trebuchet MS", sans-serif'
          : "sans-serif",
    fontSize: 14,
  },
  page: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 30 },
  nav: {
    width: "100%",
    maxWidth: 1060,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 23,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EADB",
    gap: 10,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-7deg" }],
  },
  brandName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.6 },
  brandSub: {
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 3,
    color: C.muted,
    fontWeight: "700",
  },
  helpButton: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: "#FFF",
  },
  helpButtonText: { fontSize: 12, fontWeight: "700", color: C.green },
  hero: { alignItems: "center", paddingTop: 34, paddingBottom: 30 },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#E8EFDE",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: C.green },
  eyebrowText: {
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: "800",
    color: "#5F7950",
  },
  title: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -2,
    marginTop: 13,
    textAlign: "center",
  },
  subtitle: {
    color: C.muted,
    fontSize: 15,
    marginTop: 9,
    textAlign: "center",
    lineHeight: 22,
  },
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 24,
    width: "100%",
    maxWidth: 940,
  },
  gameCard: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E9DD",
    boxShadow: "0px 8px 32px rgba(38, 64, 35, 0.045)",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 12,
  },
  scoreItem: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  scoreIcon: {
    width: 41,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: C.muted,
  },
  scoreValue: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -1,
  },
  scoreDivider: { height: 32, width: 1, backgroundColor: "#EBEDE5" },
  soundButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E9DD",
    justifyContent: "center",
    alignItems: "center",
  },
  gardenLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 12,
    gap: 5,
  },
  gardenLabelText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#7A9067",
  },
  livePill: { flexDirection: "row", gap: 4, alignItems: "center" },
  liveText: { fontSize: 9, color: "#7A9067" },
  board: {
    alignSelf: "center",
    backgroundColor: "#E5EFCB",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 0,
  },
  boardVeil: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(232,241,211,.66)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  welcome: {
    alignItems: "center",
    backgroundColor: "#FFFEF6",
    padding: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FFF",
    boxShadow: "0px 10px 30px rgba(65, 94, 41, 0.09)",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  welcomeBody: {
    fontSize: 12,
    lineHeight: 20,
    color: C.muted,
    textAlign: "center",
    marginTop: 8,
  },
  primary: {
    backgroundColor: C.green,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: C.dark,
    minHeight: 48,
  },
  secondary: {
    backgroundColor: "#EAF3E7",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  belowBoard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    paddingHorizontal: 3,
    gap: 8,
  },
  hint: { fontSize: 10, color: C.muted },
  pause: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#F2F5EC",
  },
  pauseText: { fontSize: 11, fontWeight: "700", color: C.green },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EFF1E9",
  },
  controlIntro: { flex: 1 },
  controlTitle: { fontWeight: "800", fontSize: 15 },
  controlSub: { fontSize: 11, color: C.muted, marginTop: 5 },
  dpad: { marginLeft: 8 },
  arrow: {
    width: 45,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF3E7",
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: "#DBE5D0",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowPressed: { backgroundColor: "#D5E8C7", borderBottomWidth: 1 },
  arrowText: { fontSize: 24, color: C.green, fontWeight: "700" },
  aside: { width: 320, gap: 17 },
  howCard: {
    backgroundColor: "#FFF",
    padding: 23,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#E2E9DD",
  },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconTile: {
    height: 40,
    width: 40,
    backgroundColor: "#FFF3D1",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  cardIntro: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 14,
  },
  step: { flexDirection: "row", gap: 11, marginTop: 9, marginBottom: 10 },
  number: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F1DB",
    marginTop: 1,
  },
  numberText: { fontSize: 12, fontWeight: "800" },
  stepTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  stepBody: { fontSize: 12, lineHeight: 19, color: C.muted },
  kindNote: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EDF0E7",
    paddingTop: 15,
    marginTop: 8,
  },
  kindText: { fontSize: 10, lineHeight: 17, color: C.muted, flex: 1 },
  speedCard: {
    backgroundColor: "#FFF",
    padding: 22,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#E2E9DD",
  },
  speedOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8ECE1",
    borderRadius: 14,
    marginTop: 8,
    minHeight: 65,
  },
  speedSelected: { borderColor: "#A0C48B", backgroundColor: "#F1F7E9" },
  speedTitle: { fontSize: 13, fontWeight: "800" },
  speedSubtitle: { fontSize: 9, color: C.muted, marginTop: 4 },
  radio: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderColor: "#DAE1D2",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: C.green,
  },
  speedNotice: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 12 },
  encourage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0EDD9",
    borderRadius: 17,
    padding: 17,
  },
  encourageTitle: { fontSize: 12, fontWeight: "800" },
  encourageBody: { fontSize: 10, color: "#85816A", marginTop: 5 },
  footer: { alignItems: "center", paddingTop: 31, gap: 8 },
  footerText: {
    fontSize: 8,
    letterSpacing: 1.7,
    color: "#8B9A80",
    fontWeight: "800",
  },
  footerNote: { fontSize: 10, color: "#95A08C" },
  mascot: { width: 135, height: 92, marginBottom: 14 },
  tail: {
    position: "absolute",
    left: 6,
    bottom: 6,
    width: 64,
    height: 30,
    backgroundColor: "#8CBF64",
    borderRadius: 30,
    transform: [{ rotate: "-12deg" }],
  },
  body: {
    position: "absolute",
    left: 35,
    bottom: 8,
    width: 48,
    height: 56,
    backgroundColor: "#80B659",
    borderRadius: 24,
  },
  head: {
    position: "absolute",
    right: 9,
    top: 6,
    width: 69,
    height: 61,
    borderRadius: 28,
    backgroundColor: "#82B95E",
    borderBottomWidth: 5,
    borderBottomColor: "#6CA34C",
    transform: [{ rotate: "-8deg" }],
  },
  eyes: {
    flexDirection: "row",
    gap: 9,
    position: "absolute",
    top: 13,
    left: 17,
  },
  eye: {
    width: 15,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  pupil: {
    width: 7,
    height: 9,
    backgroundColor: "#284B2E",
    borderRadius: 5,
    marginLeft: 3,
    marginTop: 2,
  },
  cheek: {
    width: 10,
    height: 6,
    backgroundColor: "#E8AE8B",
    borderRadius: 5,
    position: "absolute",
    left: 7,
    top: 34,
  },
  smile: {
    width: 14,
    height: 9,
    borderBottomWidth: 2,
    borderColor: "#305C32",
    position: "absolute",
    top: 33,
    left: 31,
    borderRadius: 10,
  },
  leaf: {
    position: "absolute",
    right: -1,
    top: 0,
    fontSize: 25,
    color: "#C3A544",
  },
  snakeEye: {
    position: "absolute",
    right: 5,
    width: 8,
    height: 8,
    backgroundColor: "white",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  snakePupil: {
    width: 4,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#183B2B",
    marginLeft: 2,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(19,46,30,.45)" },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  modalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#F6F8F1",
    padding: 20,
    borderRadius: 26,
    gap: 17,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  modalNote: { fontSize: 12, lineHeight: 20, color: C.muted },
});
