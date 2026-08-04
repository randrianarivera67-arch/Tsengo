import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Crown, RotateCcw, Cpu, User, ChevronRight, Wifi, Copy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  createFanoronaRoom,
  joinFanoronaRoom,
  subscribeFanoronaRoom,
  submitFanoronaTurn,
} from "./fanoronaOnline";

/* ============================================================
   FANORONA — CORE ENGINE
   Board: 5 rows x 9 cols (45 points). Diagonal edges exist at
   a point (r,c) when (r+c) is even — standard Fanorona lattice.
   ============================================================ */

const ROWS = 5;
const COLS = 9;
const SIZE = ROWS * COLS;

const idx = (r, c) => r * COLS + c;
const rc = (i) => [Math.floor(i / COLS), i % COLS];
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

const ORTHO = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];
const DIAG = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

// Precompute neighbor directions available from every point.
const NEIGHBOR_DIRS = (() => {
  const table = [];
  for (let i = 0; i < SIZE; i++) {
    const [r, c] = rc(i);
    const dirs = [...ORTHO, ...DIAG];
    table[i] = dirs.filter(([dr, dc]) => inBounds(r + dr, c + dc));
  }
  return table;
})();

function initialBoard() {
  const board = new Array(SIZE).fill(null);
  // Rows 0-1: White (W) fill entirely
  for (let c = 0; c < COLS; c++) {
    board[idx(0, c)] = "W";
    board[idx(1, c)] = "W";
  }
  // Row 2: left half White, right half Black, center empty
  for (let c = 0; c < 4; c++) board[idx(2, c)] = "W";
  board[idx(2, 4)] = null;
  for (let c = 5; c < COLS; c++) board[idx(2, c)] = "B";
  // Rows 3-4: Black fill entirely
  for (let c = 0; c < COLS; c++) {
    board[idx(3, c)] = "B";
    board[idx(4, c)] = "B";
  }
  return board;
}

const opponent = (p) => (p === "W" ? "B" : "W");

// Walk from a point in a direction, collecting contiguous opponent
// pieces until an empty square or the edge is hit. If an empty
// square terminates the run, those pieces are captured; if the
// board edge or own piece terminates it, nothing is captured.
function captureRun(board, start, dir, mover) {
  const [dr, dc] = dir;
  let [r, c] = rc(start);
  const captured = [];
  r += dr; c += dc;
  while (inBounds(r, c)) {
    const p = board[idx(r, c)];
    if (p === opponent(mover)) {
      captured.push(idx(r, c));
      r += dr; c += dc;
    } else if (p === null) {
      return captured; // clean run terminated by empty square
    } else {
      return []; // own piece blocks — no capture
    }
  }
  // Ran off the edge of the board without hitting an empty square or an
  // own piece: the line of enemy pieces was "unbroken" all the way to
  // the edge, so per official rules every piece found is still captured.
  return captured;
}

// All single-step options from a given piece: quiet moves and
// capturing moves (approach / withdrawal), each tagged with a
// direction so chain-capture rules (no reuse, no revisit) apply.
function stepOptions(board, from, player) {
  const options = [];
  for (const dir of NEIGHBOR_DIRS[from]) {
    const [r, c] = rc(from);
    const [dr, dc] = dir;
    const to = idx(r + dr, c + dc);
    if (board[to] !== null) continue; // destination must be empty
    const approach = captureRun(board, to, dir, player);
    const withdrawal = captureRun(board, from, [-dr, -dc], player);
    if (approach.length) {
      options.push({ from, to, dir, type: "approach", captured: approach });
    }
    if (withdrawal.length) {
      options.push({ from, to, dir, type: "withdrawal", captured: withdrawal });
    }
    if (!approach.length && !withdrawal.length) {
      options.push({ from, to, dir, type: "quiet", captured: [] });
    }
  }
  return options;
}

function applyStep(board, step) {
  const next = board.slice();
  const mover = board[step.from];
  next[step.from] = null;
  next[step.to] = mover;
  for (const cap of step.captured) next[cap] = null;
  return next;
}

// Recursively expand every legal *turn*. A turn is one quiet move,
// or a mandatory-first capture optionally extended into a chain.
// A chain step must change direction from the previous step and
// may not land on a previously visited point.
function expandCaptureChain(board, step, visited, lastDir) {
  const turns = [{ path: [step], board: applyStep(board, step) }];
  const nextBoard = applyStep(board, step);
  const nextVisited = new Set(visited);
  nextVisited.add(step.to);

  for (const dir of NEIGHBOR_DIRS[step.to]) {
    if (dir[0] === lastDir[0] && dir[1] === lastDir[1]) continue; // no immediate reuse
    const [r, c] = rc(step.to);
    const to = idx(r + dir[0], c + dir[1]);
    if (nextBoard[to] !== null) continue;
    if (nextVisited.has(to)) continue;
    const approach = captureRun(nextBoard, to, dir, board[step.from]);
    const withdrawal = captureRun(nextBoard, step.to, [-dir[0], -dir[1]], board[step.from]);
    const kinds = [];
    if (approach.length) kinds.push({ type: "approach", captured: approach });
    if (withdrawal.length) kinds.push({ type: "withdrawal", captured: withdrawal });
    for (const k of kinds) {
      const contStep = { from: step.to, to, dir, ...k };
      const sub = expandCaptureChain(nextBoard, contStep, nextVisited, dir);
      for (const s of sub) {
        turns.push({ path: [step, ...s.path], board: s.board });
      }
    }
  }
  return turns;
}

function getAllTurns(board, player) {
  const captureFirsts = [];
  const quiets = [];
  for (let i = 0; i < SIZE; i++) {
    if (board[i] !== player) continue;
    for (const opt of stepOptions(board, i, player)) {
      if (opt.type === "quiet") quiets.push(opt);
      else captureFirsts.push(opt);
    }
  }
  let turns = quiets.map((q) => ({ path: [q], board: applyStep(board, q) }));
  for (const first of captureFirsts) {
    const visited = new Set([first.from]);
    turns = turns.concat(expandCaptureChain(board, first, visited, first.dir));
  }
  return turns;
}

function countPieces(board) {
  let w = 0, b = 0;
  for (const p of board) { if (p === "W") w++; else if (p === "B") b++; }
  return { W: w, B: b };
}

function checkWinner(board, toMove) {
  const { W, B } = countPieces(board);
  if (W === 0) return "B";
  if (B === 0) return "W";
  if (getAllTurns(board, toMove).length === 0) return opponent(toMove);
  return null;
}

/* ============================================================
   AI — minimax with alpha-beta over complete turns
   ============================================================ */

function evaluate(board, aiPlayer) {
  const { W, B } = countPieces(board);
  const me = aiPlayer === "W" ? W : B;
  const opp = aiPlayer === "W" ? B : W;
  const mobility = getAllTurns(board, aiPlayer).length - getAllTurns(board, opponent(aiPlayer)).length;
  return (me - opp) * 10 + mobility * 0.3;
}

function minimax(board, player, depth, alpha, beta, aiPlayer) {
  const winner = checkWinner(board, player);
  if (winner) return winner === aiPlayer ? 10000 - depth : -10000 + depth;
  if (depth === 0) return evaluate(board, aiPlayer);

  const turns = getAllTurns(board, player);
  if (turns.length === 0) return evaluate(board, aiPlayer);

  const maximizing = player === aiPlayer;
  let best = maximizing ? -Infinity : Infinity;
  for (const t of turns) {
    const val = minimax(t.board, opponent(player), depth - 1, alpha, beta, aiPlayer);
    if (maximizing) {
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, val);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAiTurn(board, aiPlayer, difficulty) {
  const depth = { easy: 1, medium: 2, hard: 3 }[difficulty] ?? 2;
  const turns = getAllTurns(board, aiPlayer);
  if (turns.length === 0) return null;
  if (difficulty === "easy" && Math.random() < 0.35) {
    return turns[Math.floor(Math.random() * turns.length)];
  }
  let bestVal = -Infinity;
  let bestTurns = [];
  for (const t of turns) {
    const val = minimax(t.board, opponent(aiPlayer), depth - 1, -Infinity, Infinity, aiPlayer);
    if (val > bestVal) { bestVal = val; bestTurns = [t]; }
    else if (val === bestVal) bestTurns.push(t);
  }
  return bestTurns[Math.floor(Math.random() * bestTurns.length)];
}

/* ============================================================
   UI
   ============================================================ */

const COLORS = {
  bgDeep: "#0A0E1C",
  bgPanel: "#131a30",
  wood: "#1B2140",       // board base — deep indigo instead of wood
  woodLight: "#262E58",  // board highlight
  woodLine: "#5C69A0",   // grid lines — soft silver-blue
  ivory: "#F4F6FC",      // light piece — argenté / pearl
  ivoryShadow: "#AFB9DA",
  onyx: "#12162A",       // dark piece
  onyxShine: "#2A3260",
  brass: "#4F7DF3",      // primary accent — Trengo blue
  brassBright: "#F0C36D",// highlight / pulse — doré
  oxblood: "#FF3E7F",    // capture markers — Trengo rose
  textMuted: "#9AA3C8",
  pink: "#FF3E7F",
  blue: "#4F7DF3",
  gold: "#F0C36D",
  silver: "#C9D3E8",
};

function PointDot({ x, y, r = 6 }) {
  return <circle cx={x} cy={y} r={r} fill={COLORS.woodLine} opacity={0.55} />;
}

function usePointLayout(cellSize, pad) {
  return useMemo(() => {
    const pts = [];
    for (let i = 0; i < SIZE; i++) {
      const [r, c] = rc(i);
      pts.push({ i, x: pad + c * cellSize, y: pad + r * cellSize });
    }
    return pts;
  }, [cellSize, pad]);
}

export default function FanoronaPremium() {
  const navigate = useNavigate();
  const [board, setBoard] = useState(initialBoard);
  const [toMove, setToMove] = useState("W");
  const [human, setHuman] = useState("W");
  const [difficulty, setDifficulty] = useState("medium");
  const [selected, setSelected] = useState(null);
  const [chainPath, setChainPath] = useState([]); // points visited during an in-progress human chain
  const [availableOptions, setAvailableOptions] = useState([]); // options for currently selected piece / chain point
  const [inChain, setInChain] = useState(false);
  const [lastDir, setLastDir] = useState(null);
  const [visited, setVisited] = useState(new Set());
  const [log, setLog] = useState([]);
  const [winner, setWinner] = useState(null);
  const [draw, setDraw] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [trail, setTrail] = useState([]); // brass capture-trail for last completed turn
  const boardRef = useRef(null);
  const noCaptureStreakRef = useRef(0);
  const positionHistoryRef = useRef(new Map());
  const initialMountRef = useRef(true);
  const prevCountsRef = useRef(countPieces(initialBoard()));

  // --- Online multiplayer state ---
  const [mode, setMode] = useState("bot"); // "bot" | "online"
  const [roomCode, setRoomCode] = useState(null);
  const [roomStatus, setRoomStatus] = useState(null); // "waiting" | "ongoing" | "finished"
  const [joinInput, setJoinInput] = useState("");
  const [onlineError, setOnlineError] = useState(null);
  const [onlineBusy, setOnlineBusy] = useState(false);

  // Own this page's viewport fully while mounted (no Tsengo scroll behind it).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Draw detection: Fanorona's official rules leave the exact draw
  // threshold to the two players ("both can call it a draw" when
  // neither can see a way to win) — 50 plies without a capture, or
  // the same position (board + side to move) recurring 3 times, are
  // the conventions most digital implementations use.
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (winner || draw) return;
    const c = countPieces(board);
    const wasCapture = (c.W + c.B) < (prevCountsRef.current.W + prevCountsRef.current.B);
    prevCountsRef.current = c;

    if (wasCapture) {
      noCaptureStreakRef.current = 0;
      positionHistoryRef.current.clear();
    } else {
      noCaptureStreakRef.current += 1;
    }

    const key = board.join("") + "|" + toMove;
    const seen = (positionHistoryRef.current.get(key) || 0) + 1;
    positionHistoryRef.current.set(key, seen);

    if (noCaptureStreakRef.current >= 50 || seen >= 3) {
      setDraw(true);
    }
  }, [board, toMove]);

  const cellSize = 56;
  const pad = 40;
  const points = usePointLayout(cellSize, pad);
  const width = pad * 2 + (COLS - 1) * cellSize;
  const height = pad * 2 + (ROWS - 1) * cellSize;

  const aiPlayer = opponent(human);
  const counts = useMemo(() => countPieces(board), [board]);
  const fireworkParticles = useMemo(() => Array.from({ length: 18 }).map((_, i) => {
    const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 85 + Math.random() * 55;
    const palette = [COLORS.gold, COLORS.pink, COLORS.blue, COLORS.silver];
    return {
      fx: Math.cos(angle) * dist,
      fy: Math.sin(angle) * dist,
      color: palette[i % palette.length],
      delay: Math.random() * 1.1,
    };
  }), []);

  const resetGame = useCallback((startHuman = "W") => {
    setBoard(initialBoard());
    setToMove("W");
    setHuman(startHuman);
    setSelected(null);
    setChainPath([]);
    setAvailableOptions([]);
    setInChain(false);
    setLastDir(null);
    setVisited(new Set());
    setLog([]);
    setWinner(null);
    setDraw(false);
    setTrail([]);
    noCaptureStreakRef.current = 0;
    positionHistoryRef.current.clear();
    initialMountRef.current = true;
    prevCountsRef.current = countPieces(initialBoard());
  }, []);

  const leaveRoom = useCallback(() => {
    setRoomCode(null);
    setRoomStatus(null);
    setOnlineError(null);
    resetGame("W");
  }, [resetGame]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    leaveRoom();
  };

  const handleCreateRoom = async () => {
    setOnlineBusy(true);
    setOnlineError(null);
    try {
      const { code, color } = await createFanoronaRoom(initialBoard());
      setRoomCode(code);
      setHuman(color);
      setRoomStatus("waiting");
      resetGame(color);
    } catch (e) {
      setOnlineError("Tsy afaka namorona lalao — hamarino ny Firebase config");
    } finally {
      setOnlineBusy(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinInput.trim()) return;
    setOnlineBusy(true);
    setOnlineError(null);
    try {
      const { code, color } = await joinFanoronaRoom(joinInput.trim());
      setRoomCode(code);
      setHuman(color);
    } catch (e) {
      setOnlineError(
        e.message === "room-not-found" ? "Tsy hita io kaody io" :
        e.message === "room-full" ? "Feno io lalao io" :
        "Tsy afaka niditra — andramo indray"
      );
    } finally {
      setOnlineBusy(false);
    }
  };

  // Subscribe to the room once one exists; the room document is the
  // source of truth for both players in online mode.
  useEffect(() => {
    if (mode !== "online" || !roomCode) return;
    const unsub = subscribeFanoronaRoom(roomCode, (data) => {
      setBoard(data.board);
      setToMove(data.toMove);
      setRoomStatus(data.status);
      setWinner(data.winner ?? null);
      if (data.log && data.log[0]) {
        setLog((l) => (l[0]?.notation === data.log[0].notation ? l : [data.log[0], ...l].slice(0, 40)));
      }
    });
    return () => unsub();
  }, [mode, roomCode]);

  const pointLabel = (i) => {
    const [r, c] = rc(i);
    return `${String.fromCharCode(65 + c)}${ROWS - r}`;
  };

  const commitTurn = useCallback((path, boardAfter, mover) => {
    const notation = path
      .map((s) => `${pointLabel(s.from)}→${pointLabel(s.to)}${s.captured.length ? `×${s.captured.length}` : ""}`)
      .join(" ");
    const next = opponent(mover);
    const w = checkWinner(boardAfter, next);

    if (mode === "online" && roomCode) {
      // Firestore's realtime snapshot (see the subscribe effect above)
      // is the source of truth — this just pushes the validated move.
      submitFanoronaTurn(roomCode, {
        boardAfter,
        nextToMove: next,
        winner: w,
        logEntry: { mover, notation },
      }).catch(() => setOnlineError("Tsy voatahiry ilay mihetsika — jereo ny fifandraisana"));
    } else {
      setBoard(boardAfter);
      setLog((l) => [{ mover, notation }, ...l].slice(0, 40));
      if (w) setWinner(w); else setToMove(next);
    }

    setTrail(path.map((s) => s.to));
    setSelected(null);
    setAvailableOptions([]);
    setInChain(false);
    setChainPath([]);
    setVisited(new Set());
    setLastDir(null);
  }, [mode, roomCode]);

  // Human piece selection / move handling
  const handlePointClick = (i) => {
    if (winner || thinking) return;
    if (toMove !== human) return;

    if (inChain) {
      const opt = availableOptions.find((o) => o.to === i);
      if (opt) {
        const boardAfter = applyStep(board, opt);
        const newVisited = new Set(visited);
        newVisited.add(opt.to);
        const path = [...chainPath, opt];
        // check for further mandatory-optional continuation
        const cont = NEIGHBOR_DIRS[opt.to]
          .filter((d) => !(d[0] === opt.dir[0] && d[1] === opt.dir[1]))
          .flatMap((dir) => {
            const [r, c] = rc(opt.to);
            const to = idx(r + dir[0], c + dir[1]);
            if (!inBounds(r + dir[0], c + dir[1]) || boardAfter[to] !== null || newVisited.has(to)) return [];
            const approach = captureRun(boardAfter, to, dir, human);
            const withdrawal = captureRun(boardAfter, opt.to, [-dir[0], -dir[1]], human);
            const out = [];
            if (approach.length) out.push({ from: opt.to, to, dir, type: "approach", captured: approach });
            if (withdrawal.length) out.push({ from: opt.to, to, dir, type: "withdrawal", captured: withdrawal });
            return out;
          });
        if (cont.length > 0) {
          setBoard(boardAfter);
          setChainPath(path);
          setVisited(newVisited);
          setLastDir(opt.dir);
          setAvailableOptions(cont);
          setSelected(opt.to);
        } else {
          commitTurn(path, boardAfter, human);
        }
      } else if (i === selected) {
        // deselect / stop chain early
        commitTurn(chainPath, board, human);
      }
      return;
    }

    if (selected === null) {
      if (board[i] !== human) return;
      const myOptions = stepOptions(board, i, human);
      if (myOptions.length === 0) return;
      setSelected(i);
      setAvailableOptions(myOptions);
    } else {
      if (i === selected) { setSelected(null); setAvailableOptions([]); return; }
      const opt = availableOptions.find((o) => o.to === i);
      if (!opt) {
        if (board[i] === human) {
          const myOptions = stepOptions(board, i, human);
          if (myOptions.length) { setSelected(i); setAvailableOptions(myOptions); }
        }
        return;
      }
      if (opt.captured.length > 0) {
        const boardAfter = applyStep(board, opt);
        const newVisited = new Set([opt.from, opt.to]);
        const cont = NEIGHBOR_DIRS[opt.to]
          .filter((d) => !(d[0] === opt.dir[0] && d[1] === opt.dir[1]))
          .flatMap((dir) => {
            const [r, c] = rc(opt.to);
            const to = idx(r + dir[0], c + dir[1]);
            if (!inBounds(r + dir[0], c + dir[1]) || boardAfter[to] !== null || newVisited.has(to)) return [];
            const approach = captureRun(boardAfter, to, dir, human);
            const withdrawal = captureRun(boardAfter, opt.to, [-dir[0], -dir[1]], human);
            const out = [];
            if (approach.length) out.push({ from: opt.to, to, dir, type: "approach", captured: approach });
            if (withdrawal.length) out.push({ from: opt.to, to, dir, type: "withdrawal", captured: withdrawal });
            return out;
          });
        if (cont.length > 0) {
          setInChain(true);
          setBoard(boardAfter);
          setChainPath([opt]);
          setVisited(newVisited);
          setLastDir(opt.dir);
          setAvailableOptions(cont);
          setSelected(opt.to);
        } else {
          commitTurn([opt], boardAfter, human);
        }
      } else {
        const boardAfter = applyStep(board, opt);
        commitTurn([opt], boardAfter, human);
      }
    }
  };

  // AI turn
  useEffect(() => {
    if (mode !== "bot" || winner || draw || toMove !== aiPlayer) return;
    setThinking(true);
    const t = setTimeout(() => {
      const turn = chooseAiTurn(board, aiPlayer, difficulty);
      if (turn) {
        commitTurn(turn.path, turn.board, aiPlayer);
      } else {
        setWinner(human);
      }
      setThinking(false);
    }, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, toMove, winner, draw]);

  const highlightSet = new Set(availableOptions.map((o) => o.to));
  const captureTargets = new Set(availableOptions.flatMap((o) => o.captured));
  const capturablePieces = useMemo(() => {
    if (winner || draw || toMove !== human) return new Set();
    const turns = getAllTurns(board, human);
    return new Set(turns.filter((t) => t.path[0].captured.length > 0).map((t) => t.path[0].from));
  }, [board, human, toMove, winner, draw]);

  return (
    <div
      className="fp-shell"
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at top, ${COLORS.bgPanel} 0%, ${COLORS.bgDeep} 65%)`,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: COLORS.ivory,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 10px",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .fp-display { font-family: 'Fraunces', Georgia, serif; }
        .fp-mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes fp-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        .fp-pulse { animation: fp-pulse 1.4s ease-in-out infinite; }
        @keyframes fp-fade-in { from { opacity: 0; transform: translateY(4px);} to { opacity:1; transform:translateY(0);} }
        .fp-fade { animation: fp-fade-in .35s ease both; }
        @keyframes fp-firework {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--fx), var(--fy)) scale(0); opacity: 0; }
        }
        .fp-firework-particle {
          position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; border-radius: 50%;
          animation: fp-firework 1.1s ease-out infinite;
        }
        @keyframes fp-pop-in {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .fp-result-pop { animation: fp-pop-in .5s cubic-bezier(.2,1.4,.4,1) both; }
        @keyframes fp-glow-text {
          0%,100% { text-shadow: 0 0 18px rgba(240,195,109,0.55), 0 0 40px rgba(255,62,127,0.35); }
          50% { text-shadow: 0 0 30px rgba(240,195,109,0.9), 0 0 60px rgba(255,62,127,0.55); }
        }
        .fp-win-text { animation: fp-glow-text 1.8s ease-in-out infinite; }
        * { box-sizing: border-box; }
        html, body { height: 100%; }
        .fp-layout { display: flex; flex-direction: row; flex-wrap: nowrap; gap: 16px; justify-content: center; align-items: flex-start; width: 100%; max-width: 980px; margin: 0 auto; }
        .fp-board-card { flex: 1 1 auto; min-width: 0; display: flex; justify-content: center; }
        .fp-board-card svg { width: 100%; height: auto; max-width: 640px; display: block; }
        .fp-side-panel { flex: 0 0 auto; width: 240px; display: flex; flex-direction: column; gap: 10px; }

        /* Force a landscape layout even while the phone is held upright —
           rotates the whole game 90° to fill the screen like a native
           landscape game — and keep every panel compact enough to fit
           without scrolling. */
        @media (orientation: portrait) {
          .fp-shell {
            position: fixed;
            top: 0;
            left: 0;
            width: 100dvh;
            height: 100dvw;
            min-height: 100dvw !important;
            transform-origin: top left;
            transform: rotate(90deg) translateY(-100%);
            overflow: hidden;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            padding: 8px 14px !important;
            z-index: 2147483000;
          }
          .fp-header { margin-bottom: 6px !important; }
          .fp-header h1 { font-size: 18px !important; margin: 0 !important; }
          .fp-header p { display: none !important; }
          .fp-mode-toggle button { padding: 5px 12px !important; font-size: 11px !important; }
          .fp-layout { gap: 10px; align-items: center !important; }
          .fp-board-card svg { max-width: min(58vh, 66dvh) !important; }
          .fp-board-wood { padding: 8px !important; border-radius: 12px !important; }
          .fp-side-panel { width: 128px; gap: 6px; }
          .fp-side-panel > div { padding: 7px !important; border-radius: 10px !important; }
          .fp-side-log { display: none !important; }
          .fp-panel-label { font-size: 8px !important; margin-bottom: 4px !important; }
          .fp-piece-row span { font-size: 10px !important; }
          .fp-piece-count { font-size: 13px !important; }
          .fp-diff-btn { padding: 4px 0 !important; font-size: 9px !important; }
          .fp-status-text { font-size: 10px !important; margin-top: 8px !important; padding-top: 8px !important; }
          .fp-newgame-btn { margin-top: 8px !important; padding: 6px 0 !important; font-size: 10px !important; }
          .fp-swap-btn { margin-top: 6px !important; padding: 5px 0 !important; font-size: 9px !important; }
        }
      `}</style>

      <button
        onClick={() => navigate("/")}
        aria-label="Miverina"
        style={{
          position: "fixed", bottom: 10, left: 10, zIndex: 2147483001,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: "50%",
          background: COLORS.bgPanel, border: `1px solid ${COLORS.woodLine}55`,
          color: COLORS.brassBright, cursor: "pointer",
        }}
      >
        <ArrowLeft size={16} />
      </button>

      <header className="fp-fade fp-header" style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 className="fp-display" style={{
          fontSize: 40, fontWeight: 600, margin: "6px 0 4px", letterSpacing: "-0.01em",
          background: `linear-gradient(100deg, ${COLORS.silver}, ${COLORS.gold} 45%, ${COLORS.pink} 85%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Fanorona
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, maxWidth: 380 }}>
          Ny lalao malagasy nandritra ny taonjato maro — mifidiana lalana, samboro ny mpanohitra
        </p>
        <div className="fp-mode-toggle" style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
          {[
            { key: "bot", label: "Robot", Icon: Cpu },
            { key: "online", label: "Olona", Icon: Wifi },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999,
                border: `1px solid ${mode === key ? COLORS.brassBright : COLORS.woodLine + "55"}`,
                background: mode === key ? COLORS.brass + "33" : "transparent",
                color: mode === key ? COLORS.brassBright : COLORS.textMuted,
                fontSize: 13, cursor: "pointer",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      {mode === "online" && (!roomCode || roomStatus === "waiting") && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2147483002,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(6,9,20,0.6)", backdropFilter: "blur(2px)",
        }}>
          <div className="fp-fade fp-lobby-card" style={{
            position: "relative",
            background: `linear-gradient(165deg, ${COLORS.bgPanel}, ${COLORS.bgDeep})`,
            borderRadius: 16, padding: 22, width: "min(300px, 78vw)", maxHeight: "82%", overflowY: "auto",
            border: `1px solid ${COLORS.blue}44`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${COLORS.pink}22`,
            textAlign: "center",
          }}>
            <button
              onClick={() => switchMode("bot")}
              aria-label="Miala"
              style={{
                position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%",
                border: `1px solid ${COLORS.woodLine}55`, background: "transparent", color: COLORS.textMuted,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15,
              }}
            >
              ×
            </button>

            {!roomCode ? (
              <>
                <Wifi size={20} color={COLORS.gold} />
                <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "10px 0 16px" }}>
                  Mamorona lalao vaovao ka izarao ilay kaody, na ampidiro ny kaody nomen'ny namanao
                </p>
                <button
                  onClick={handleCreateRoom}
                  disabled={onlineBusy}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                    background: `linear-gradient(120deg, ${COLORS.blue}, ${COLORS.pink})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: `0 6px 18px ${COLORS.blue}55`,
                    marginBottom: 10, opacity: onlineBusy ? 0.6 : 1,
                  }}
                >
                  Mamorona lalao
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    placeholder="Kaody (5 marika)"
                    maxLength={5}
                    className="fp-mono"
                    style={{
                      flex: 1, padding: "9px 10px", borderRadius: 8, border: `1px solid ${COLORS.woodLine}55`,
                      background: "transparent", color: COLORS.ivory, fontSize: 13, letterSpacing: "0.1em",
                    }}
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={onlineBusy}
                    style={{
                      padding: "0 16px", borderRadius: 8, border: `1px solid ${COLORS.gold}66`,
                      background: "transparent", color: COLORS.gold, fontSize: 13, cursor: "pointer", opacity: onlineBusy ? 0.6 : 1,
                    }}
                  >
                    Miditra
                  </button>
                </div>
                {onlineError && <p style={{ color: COLORS.pink, fontSize: 12, marginTop: 10 }}>{onlineError}</p>}
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>Miandry namana hiditra…</p>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  fontSize: 24, letterSpacing: "0.3em", fontWeight: 600,
                  background: `linear-gradient(120deg, ${COLORS.gold}, ${COLORS.pink})`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }} className="fp-mono fp-pulse">
                  {roomCode}
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(roomCode)}
                  style={{
                    marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 999, border: `1px solid ${COLORS.woodLine}55`,
                    background: "transparent", color: COLORS.textMuted, fontSize: 11, cursor: "pointer",
                  }}
                >
                  <Copy size={12} /> Adikao
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {winner && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2147483003,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(6,9,20,0.78)", backdropFilter: "blur(3px)", padding: 20, textAlign: "center",
        }}>
          {winner === human ? (
            <div className="fp-result-pop" style={{ position: "relative", width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {fireworkParticles.map((p, i) => (
                <span
                  key={i}
                  className="fp-firework-particle"
                  style={{ "--fx": `${p.fx}px`, "--fy": `${p.fy}px`, background: p.color, animationDelay: `${p.delay}s` }}
                />
              ))}
              <Crown size={46} color={COLORS.gold} style={{ position: "relative", zIndex: 1 }} />
            </div>
          ) : (
            <div className="fp-result-pop" style={{
              width: 104, height: 104, borderRadius: "50%", border: `4px solid ${COLORS.pink}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 40px ${COLORS.pink}88`,
            }}>
              <span style={{ fontSize: 54, color: COLORS.pink, fontWeight: 800, lineHeight: 1 }}>×</span>
            </div>
          )}

          <h2
            className={`fp-display fp-result-pop${winner === human ? " fp-win-text" : ""}`}
            style={{
              fontSize: 30, margin: "16px 0 6px", fontWeight: 700,
              ...(winner === human
                ? {
                    background: `linear-gradient(120deg, ${COLORS.gold}, ${COLORS.pink})`,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  }
                : { color: COLORS.pink }),
            }}
          >
            {winner === human ? "Nandresy ianao!" : "Resy ianao"}
          </h2>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 18 }}>
            {mode === "bot"
              ? (winner === human ? "Naharesy ny robot ianao" : "Nandresy anao ny robot")
              : (winner === human ? "Naharesy ny namanao ianao" : "Nandresy anao ny namanao")}
          </p>
          <button
            onClick={() => (mode === "bot" ? resetGame(human) : leaveRoom())}
            style={{
              padding: "10px 24px", borderRadius: 999, border: "none",
              background: `linear-gradient(120deg, ${COLORS.blue}, ${COLORS.pink})`,
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              boxShadow: `0 6px 18px ${COLORS.blue}55`,
            }}
          >
            Lalao vaovao
          </button>
        </div>
      )}

      {(winner || draw) && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2147483003,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(6,9,20,0.78)", backdropFilter: "blur(3px)",
        }}>
          {draw ? (
            <div className="fp-result-pop" style={{
              width: 110, height: 110, borderRadius: "50%", border: `4px solid ${COLORS.silver}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 40px ${COLORS.silver}55`,
            }}>
              <span style={{ fontSize: 42, color: COLORS.silver, fontWeight: 800, lineHeight: 1 }}>=</span>
            </div>
          ) : winner === human ? (
            <div className="fp-result-pop" style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {fireworkParticles.map((p, i) => (
                <span
                  key={i}
                  className="fp-firework-particle"
                  style={{ "--fx": `${p.fx}px`, "--fy": `${p.fy}px`, background: p.color, animationDelay: `${p.delay}s` }}
                />
              ))}
              <Crown size={50} color={COLORS.gold} style={{ position: "relative", zIndex: 1 }} />
            </div>
          ) : (
            <div className="fp-result-pop" style={{
              width: 110, height: 110, borderRadius: "50%", border: `4px solid ${COLORS.pink}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 40px ${COLORS.pink}77`,
            }}>
              <span style={{ fontSize: 58, color: COLORS.pink, fontWeight: 800, lineHeight: 1 }}>×</span>
            </div>
          )}

          <h2
            className={`fp-display fp-result-pop${winner === human ? " fp-win-text" : ""}`}
            style={{
              fontSize: 32, margin: "16px 0 6px", fontWeight: 700,
              ...(draw
                ? { color: COLORS.silver }
                : winner === human
                ? { background: `linear-gradient(120deg, ${COLORS.gold}, ${COLORS.pink})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }
                : { color: COLORS.pink }),
            }}
          >
            {draw ? "Mitovy" : winner === human ? "Nandresy ianao!" : "Resy ianao"}
          </h2>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 18 }}>
            {draw
              ? "Samy tsy nahita fomba handresena ny mpilalao roa tonta"
              : mode === "bot"
              ? (winner === human ? "Naharesy ny robot ianao" : "Nandresy anao ny robot")
              : (winner === human ? "Naharesy ny namanao ianao" : "Nandresy anao ny namanao")}
          </p>
          <button
            onClick={() => (mode === "bot" ? resetGame(human) : leaveRoom())}
            style={{
              padding: "10px 24px", borderRadius: 999, border: "none",
              background: `linear-gradient(120deg, ${COLORS.blue}, ${COLORS.pink})`,
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              boxShadow: `0 6px 18px ${COLORS.blue}55`,
            }}
          >
            Lalao vaovao
          </button>
        </div>
      )}

      <div className="fp-layout" style={{ opacity: mode === "online" && !(roomCode && roomStatus !== "waiting") ? 0.35 : 1, pointerEvents: mode === "online" && !(roomCode && roomStatus !== "waiting") ? "none" : "auto" }}>
        {/* Board */}
        <div className="fp-board-card">
        <div
          className="fp-fade fp-board-wood"
          style={{
            background: `linear-gradient(160deg, ${COLORS.woodLight}, ${COLORS.wood} 60%)`,
            borderRadius: 18,
            padding: 22,
            boxShadow: "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
            border: `1px solid ${COLORS.woodLine}55`,
            width: "100%",
          }}
        >
          <svg ref={boardRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
            <defs>
              <radialGradient id="ivoryGrad" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#FFFBF0" />
                <stop offset="55%" stopColor={COLORS.ivory} />
                <stop offset="100%" stopColor={COLORS.ivoryShadow} />
              </radialGradient>
              <radialGradient id="onyxGrad" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor={COLORS.onyxShine} />
                <stop offset="60%" stopColor={COLORS.onyx} />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
            </defs>

            {/* grid lines */}
            {points.map(({ i, x, y }) =>
              NEIGHBOR_DIRS[i].map((dir, k) => {
                const [r, c] = rc(i);
                const ni = idx(r + dir[0], c + dir[1]);
                if (ni < i) return null; // draw each edge once
                const p2 = points[ni];
                return (
                  <line
                    key={`${i}-${k}`}
                    x1={x} y1={y} x2={p2.x} y2={p2.y}
                    stroke={COLORS.woodLine}
                    strokeWidth={1.5}
                    opacity={0.45}
                  />
                );
              })
            )}

            {/* brass capture trail from the last completed turn */}
            {trail.length > 1 &&
              trail.slice(1).map((to, k) => {
                const from = trail[k];
                const p1 = points[from];
                const p2 = points[to];
                return (
                  <line
                    key={`trail-${k}`}
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={COLORS.brassBright}
                    strokeWidth={3}
                    opacity={0.85}
                    strokeLinecap="round"
                  />
                );
              })}

            {points.map(({ i, x, y }) => (
              <PointDot key={i} x={x} y={y} />
            ))}

            {/* coordinate labels — lets players report an exact point (e.g. "E3") */}
            {points.map(({ i, x, y }) => (
              <text
                key={`lbl-${i}`}
                x={x}
                y={y - cellSize * 0.42}
                textAnchor="middle"
                fontSize={9}
                fontFamily="'IBM Plex Mono', monospace"
                fill={COLORS.textMuted}
                opacity={0.55}
                style={{ pointerEvents: "none" }}
              >
                {pointLabel(i)}
              </text>
            ))}

            {/* capture targets (about to be removed) */}
            {[...captureTargets].map((i) => {
              const p = points[i];
              return <circle key={`cap-${i}`} cx={p.x} cy={p.y} r={cellSize * 0.32} fill="none" stroke={COLORS.oxblood} strokeWidth={2.5} opacity={0.9} />;
            })}

            {/* legal destination highlights */}
            {[...highlightSet].map((i) => {
              const p = points[i];
              return (
                <circle
                  key={`hi-${i}`}
                  cx={p.x} cy={p.y} r={cellSize * 0.16}
                  fill={COLORS.brassBright}
                  className="fp-pulse"
                />
              );
            })}

            {/* pieces */}
            {points.map(({ i, x, y }) => {
              const p = board[i];
              if (!p) return null;
              const isSelected = selected === i;
              const mustCapture = p === human && capturablePieces.has(i);
              return (
                <g key={`piece-${i}`} onClick={() => handlePointClick(i)} style={{ cursor: toMove === human ? "pointer" : "default" }}>
                  {mustCapture && !isSelected && (
                    <circle cx={x} cy={y} r={cellSize * 0.36} fill="none" stroke={COLORS.pink} strokeWidth={2} className="fp-pulse" />
                  )}
                  {isSelected && (
                    <circle cx={x} cy={y} r={cellSize * 0.34} fill="none" stroke={COLORS.brassBright} strokeWidth={2.5} />
                  )}
                  <circle
                    cx={x} cy={y} r={cellSize * 0.3}
                    fill={p === "W" ? "url(#ivoryGrad)" : "url(#onyxGrad)"}
                    stroke={p === "W" ? COLORS.ivoryShadow : "#000"}
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {/* empty-point click targets */}
            {points.map(({ i, x, y }) =>
              board[i] === null ? (
                <circle
                  key={`hit-${i}`}
                  cx={x} cy={y} r={cellSize * 0.34}
                  fill="transparent"
                  onClick={() => handlePointClick(i)}
                  style={{ cursor: highlightSet.has(i) ? "pointer" : "default" }}
                />
              ) : null
            )}
          </svg>
        </div>
        </div>

        {/* Side panel */}
        <div className="fp-fade fp-side-panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: COLORS.bgPanel, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.woodLine}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="fp-piece-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "url(#) " + COLORS.ivory, boxShadow: `0 0 0 2px ${COLORS.ivoryShadow} inset` }} />
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{human === "W" ? "Ianao" : mode === "bot" ? "Robot" : "Namanao"}</span>
              </div>
              <span className="fp-mono fp-piece-count" style={{ fontSize: 18 }}>{counts.W}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }} className="fp-piece-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.onyx, boxShadow: `0 0 0 2px #000 inset` }} />
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{human === "B" ? "Ianao" : mode === "bot" ? "Robot" : "Namanao"}</span>
              </div>
              <span className="fp-mono fp-piece-count" style={{ fontSize: 18 }}>{counts.B}</span>
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.woodLine}33`, fontSize: 13 }} className="fp-status-text">
              {draw ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.silver }}>
                  <span>Mitovy</span>
                </div>
              ) : winner ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.brassBright }}>
                  <Crown size={16} />
                  <span>{winner === human ? "Nandresy ianao!" : mode === "bot" ? "Nandresy ny robot" : "Nandresy ny namanao"}</span>
                </div>
              ) : mode === "online" && roomStatus === "waiting" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textMuted }}>
                  <Wifi size={14} className="fp-pulse" />
                  <span>Miandry namana…</span>
                </div>
              ) : thinking ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textMuted }}>
                  <Cpu size={14} className="fp-pulse" />
                  <span>Mieritreritra ny robot…</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {toMove === human ? <User size={14} /> : <Cpu size={14} />}
                  <span>
                    {toMove === human
                      ? (inChain ? "Manohy fisamborana — na tsindrio ny pion mba hijanona" : "Toronao no mietsika")
                      : mode === "bot" ? "Tolon'ny robot" : "Tolon'ny namanao"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {mode === "bot" ? (
            <div style={{ background: COLORS.bgPanel, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.woodLine}33` }}>
              <div className="fp-panel-label" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.textMuted, marginBottom: 10 }}>
                Robot
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    className="fp-diff-btn"
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: `1px solid ${difficulty === d ? COLORS.brassBright : COLORS.woodLine + "55"}`,
                      background: difficulty === d ? COLORS.brass + "33" : "transparent",
                      color: difficulty === d ? COLORS.brassBright : COLORS.textMuted,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {d === "easy" ? "Mora" : d === "medium" ? "Antonony" : "Sarotra"}
                  </button>
                ))}
              </div>
              <button
                className="fp-newgame-btn"
                onClick={() => resetGame(human)}
                style={{
                  marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                  background: `linear-gradient(120deg, ${COLORS.blue}, ${COLORS.pink})`, color: "#fff", fontWeight: 700, fontSize: 13,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer",
                }}
              >
                <RotateCcw size={14} /> Lalao vaovao
              </button>
              <button
                className="fp-swap-btn"
                onClick={() => resetGame(human === "W" ? "B" : "W")}
                style={{
                  marginTop: 8, width: "100%", padding: "9px 0", borderRadius: 8,
                  border: `1px solid ${COLORS.woodLine}55`, background: "transparent", color: COLORS.textMuted, fontSize: 12, cursor: "pointer",
                }}
              >
                Mifanakalo loko
              </button>
            </div>
          ) : (
            <div style={{ background: COLORS.bgPanel, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.woodLine}33` }}>
              <div className="fp-panel-label" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.textMuted, marginBottom: 10 }}>
                Lalao an-tserasera
              </div>
              {roomCode && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className="fp-mono" style={{ fontSize: 16, letterSpacing: "0.15em" }}>{roomCode}</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {human === "W" ? "Fotsy" : "Mainty"}
                  </span>
                </div>
              )}
              <button
                className="fp-swap-btn"
                onClick={leaveRoom}
                style={{
                  width: "100%", padding: "9px 0", borderRadius: 8,
                  border: `1px solid ${COLORS.woodLine}55`, background: "transparent", color: COLORS.textMuted, fontSize: 12, cursor: "pointer",
                }}
              >
                Miala amin'ny lalao
              </button>
            </div>
          )}

          <div className="fp-side-log" style={{ background: COLORS.bgPanel, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.woodLine}33`, maxHeight: 220, overflowY: "auto" }}>
            <div className="fp-panel-label" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.textMuted, marginBottom: 10 }}>
              Tantaram-pilalaovana
            </div>
            {log.length === 0 && <div style={{ fontSize: 12, color: COLORS.textMuted + "aa" }}>Mbola tsy nisy fihetsehana</div>}
            {log.map((entry, k) => (
              <div key={k} className="fp-mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "3px 0", color: entry.mover === "W" ? COLORS.ivory : COLORS.textMuted }}>
                <ChevronRight size={12} style={{ opacity: 0.5 }} />
                <span style={{ opacity: 0.6 }}>{entry.mover}</span>
                <span>{entry.notation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
