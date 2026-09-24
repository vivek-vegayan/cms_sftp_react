import React, { useEffect, useRef } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
  r: number;
  phase: number;
  hub: boolean;
  alert: boolean;
}

interface Edge {
  a: Node;
  b: Node;
}

interface Packet {
  edge: Edge;
  t: number;
  speed: number;
  color: "ok" | "alert";
}

interface Props {
  dark: boolean;
}

// NOC-style network topology backdrop for the login screen: a fixed grid of
// nodes with jitter, nearest-neighbour edges, travelling "packets", hub/alert
// node variants and a radar sweep. Purely decorative — no state or business
// logic lives here, so it is isolated from the auth flow.
const AnimatedBackground: React.FC<Props> = ({ dark }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const darkRef = useRef(dark);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    darkRef.current = dark;
  }, [dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let packets: Packet[] = [];
    let sweepAngle = 0;

    const spawnPacket = () => {
      if (!edges.length) return;
      const e = edges[Math.floor(Math.random() * edges.length)];
      const dir = Math.random() < 0.5 ? 1 : -1;
      packets.push({
        edge: e,
        t: dir === 1 ? 0 : 1,
        speed: (0.004 + Math.random() * 0.006) * dir,
        color: Math.random() < 0.15 ? "alert" : "ok",
      });
    };

    const build = () => {
      const cols = W > 720 ? 6 : 5;
      const rows = H > 720 ? 5 : 4;
      const cellW = W / cols,
        cellH = H / rows;
      nodes = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const jitterX = (Math.random() - 0.5) * cellW * 0.45;
          const jitterY = (Math.random() - 0.5) * cellH * 0.45;
          nodes.push({
            id: nodes.length,
            x: (c + 0.5) * cellW + jitterX,
            y: (r + 0.5) * cellH + jitterY,
            r: Math.random() < 0.15 ? 3.2 : 2.0,
            phase: Math.random() * Math.PI * 2,
            hub: Math.random() < 0.15,
            alert: Math.random() < 0.06,
          });
        }
      }

      edges = [];
      const seen = new Set<string>();
      for (const n of nodes) {
        const dists = nodes
          .filter((m) => m.id !== n.id)
          .map((m) => ({ m, d: Math.hypot(m.x - n.x, m.y - n.y) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 2);
        for (const { m } of dists) {
          const key = n.id < m.id ? `${n.id}-${m.id}` : `${m.id}-${n.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({ a: n, b: m });
          }
        }
      }

      packets = [];
      for (let i = 0; i < 6; i++) spawnPacket();
    };

    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      ctx.clearRect(0, 0, W, H);

      const dark = darkRef.current;
      const edgeCol = dark ? "rgba(120,170,255," : "rgba(30,90,180,";
      const nodeCol = dark ? "rgba(160,200,255," : "rgba(20,70,160,";
      const hubCol = dark ? "rgba(120,180,255,0.9)" : "rgba(37,99,235,0.85)";
      const alertCol = "rgba(237,90,90,";
      const okPacket = dark ? "#7db8ff" : "#0e7ec0";
      const alertPacket = "#ED1C24";
      const sweepCol = dark ? "rgba(79,141,255," : "rgba(37,99,235,";

      const cx = W * 0.5,
        cy = H * 0.5;
      sweepAngle += dt * 0.0007;
      if (sweepAngle > Math.PI * 2) sweepAngle -= Math.PI * 2;
      const sweepR = Math.hypot(W, H) * 0.7;
      const grad = ctx.createConicGradient
        ? ctx.createConicGradient(sweepAngle - Math.PI / 2, cx, cy)
        : null;
      if (grad) {
        grad.addColorStop(0.0, `${sweepCol}0)`);
        grad.addColorStop(0.02, `${sweepCol}0.10)`);
        grad.addColorStop(0.08, `${sweepCol}0)`);
        grad.addColorStop(1.0, `${sweepCol}0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, sweepR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 0.7;
      for (const e of edges) {
        ctx.strokeStyle = `${edgeCol}0.16)`;
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        ctx.stroke();
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed;
        if (p.t < 0 || p.t > 1) {
          packets.splice(i, 1);
          continue;
        }
        const x = p.edge.a.x + (p.edge.b.x - p.edge.a.x) * p.t;
        const y = p.edge.a.y + (p.edge.b.y - p.edge.a.y) * p.t;
        const color = p.color === "alert" ? alertPacket : okPacket;
        const dx = p.edge.b.x - p.edge.a.x,
          dy = p.edge.b.y - p.edge.a.y;
        const len = Math.hypot(dx, dy) || 1;
        const tx = x - (dx / len) * 14 * Math.sign(p.speed);
        const ty = y - (dy / len) * 14 * Math.sign(p.speed);
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, `${color}00`);
        g.addColorStop(1, color);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (Math.random() < 0.045) spawnPacket();
      while (packets.length > 14) packets.shift();

      for (const n of nodes) {
        n.phase += dt * 0.002;
        const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(n.phase));
        if (n.alert) {
          ctx.fillStyle = `${alertCol}${0.15 + 0.25 * pulse})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = alertPacket;
        } else if (n.hub) {
          ctx.fillStyle = hubCol;
        } else {
          ctx.fillStyle = `${nodeCol}${0.35 + 0.35 * pulse})`;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (n.hub) {
          ctx.strokeStyle = `${nodeCol}0.25)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 3 + pulse * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

export default AnimatedBackground;
