import { useEffect, useRef } from "react";

const MONO = "'IBM Plex Mono', monospace";

interface Node { x: number; y: number; vx: number; vy: number; bx: number; by: number; r: number; phase: number; }
interface Particle { x: number; y: number; vx: number; vy: number; a: number; r: number; }

export function DaisyAvatar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const container = containerRef.current as HTMLDivElement;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    let W = container.clientWidth;
    let H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // ── Load avatar image ──────────────────────────────────────────────────
    const img = new Image();
    img.src = "/daisy-avatar.png";

    // ── Neural network nodes ───────────────────────────────────────────────
    function makeNodes(side: "left" | "right"): Node[] {
      const cx = side === "left" ? W * 0.17 : W * 0.83;
      const cy = H * 0.48;
      const spread = Math.min(W * 0.1, 80);
      return Array.from({ length: 9 }, (_, i) => {
        const angle = (i / 9) * Math.PI * 2;
        const dist = spread * (0.35 + Math.random() * 0.65);
        const bx = cx + Math.cos(angle) * dist;
        const by = cy + Math.sin(angle) * dist * 0.7;
        return { x: bx, y: by, vx: 0, vy: 0, bx, by, r: 3 + Math.random() * 2.5, phase: Math.random() * Math.PI * 2 };
      });
    }

    // ── Particles ──────────────────────────────────────────────────────────
    const PARTICLES = 120;
    const particles: Particle[] = Array.from({ length: PARTICLES }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.3,
      a: Math.random(), r: Math.random() * 1.5 + 0.5,
    }));

    let leftNodes: Node[] = makeNodes("left");
    let rightNodes: Node[] = makeNodes("right");
    let t = 0;
    let frameId: number;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function drawGlowCircle(x: number, y: number, r: number, color: string, glowSize: number, alpha: number) {
      const grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r + glowSize);
      grad.addColorStop(0, color.replace(")", `, ${alpha})`).replace("rgb(", "rgba("));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(x, y, r + glowSize, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function drawRing(cx: number, cy: number, rx: number, ry: number, pulse: number) {
      // Outer glow
      for (let layer = 3; layer >= 1; layer--) {
        const alpha = (0.06 + pulse * 0.04) / layer;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + layer * 6, ry + layer * 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
        ctx.lineWidth = 8;
        ctx.stroke();
      }
      // Main ring
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      const ringAlpha = 0.7 + pulse * 0.3;
      ctx.strokeStyle = `rgba(56,189,248,${ringAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Inner bright ring
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx - 3, ry - 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125,211,252,${ringAlpha * 0.45})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function drawNodes(nodes: Node[], t: number) {
      // Draw connecting lines first
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            const alpha = (1 - dist / 90) * 0.55;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(14,165,233,${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      // Draw nodes
      nodes.forEach((n, i) => {
        const pulse = 0.7 + Math.sin(t * 1.2 + n.phase) * 0.3;
        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.5);
        grad.addColorStop(0, `rgba(56,189,248,${0.35 * pulse})`);
        grad.addColorStop(1, "rgba(56,189,248,0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(125,211,252,${0.9 * pulse})`;
        ctx.fill();
        // Ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56,189,248,${0.4 * pulse})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        void i;
      });
    }

    function drawScanLine(cy: number, faceTop: number, faceH: number) {
      const scanY = faceTop + ((t * 60) % faceH);
      const alpha = 0.3 + 0.2 * Math.sin(t * 2);
      ctx.beginPath();
      ctx.moveTo(cy - faceH * 0.88, scanY);
      ctx.lineTo(cy + faceH * 0.88, scanY);
      const grad = ctx.createLinearGradient(cy - faceH * 0.88, 0, cy + faceH * 0.88, 0);
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.5, `rgba(56,189,248,${alpha})`);
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function connectNodesToRing(nodes: Node[], ringCx: number, ringCy: number, rx: number, ry: number, side: "left" | "right") {
      // Find two closest nodes to the ring edge
      const edgeX = side === "left" ? ringCx - rx : ringCx + rx;
      const edgeY = ringCy;
      const sorted = [...nodes].sort((a, b) =>
        Math.hypot(a.x - edgeX, a.y - edgeY) - Math.hypot(b.x - edgeX, b.y - edgeY)
      );
      sorted.slice(0, 3).forEach(n => {
        const alpha = 0.28 + Math.sin(t * 0.8 + n.phase) * 0.1;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(edgeX, edgeY);
        ctx.strokeStyle = `rgba(14,165,233,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    function draw() {
      frameId = requestAnimationFrame(draw);
      t += 0.012;

      W = container!.clientWidth;
      H = container!.clientHeight;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
        leftNodes = makeNodes("left");
        rightNodes = makeNodes("right");
      }

      // ── Background ──────────────────────────────────────────────────────
      ctx.fillStyle = "#02040e";
      ctx.fillRect(0, 0, W, H);

      // Subtle radial vignette glow center
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55);
      bgGrad.addColorStop(0, "rgba(7,14,36,0.6)");
      bgGrad.addColorStop(1, "rgba(2,4,14,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Particles ───────────────────────────────────────────────────────
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const a = (Math.sin(t * 0.8 + p.a * 10) * 0.5 + 0.5) * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30,64,175,${a})`;
        ctx.fill();
      });

      // ── Animate nodes ───────────────────────────────────────────────────
      const allNodes = [leftNodes, rightNodes];
      allNodes.forEach(group => {
        group.forEach(n => {
          n.x = n.bx + Math.sin(t * 0.7 + n.phase) * 4;
          n.y = n.by + Math.cos(t * 0.55 + n.phase) * 3;
        });
      });

      // ── Face image dimensions ───────────────────────────────────────────
      const faceW = Math.min(W * 0.72, H * 1.4);
      const faceH = faceW / (1024 / 588);
      const faceX = (W - faceW) / 2;
      const faceY = (H - faceH) / 2;

      // ── Ring ─────────────────────────────────────────────────────────────
      const ringCx = W / 2 + faceW * 0.012;
      const ringCy = H / 2 - faceH * 0.04;
      const rx = faceH * 0.475;
      const ry = rx;
      const pulse = 0.5 + Math.sin(t * 1.4) * 0.5;
      drawRing(ringCx, ringCy, rx, ry, pulse);

      // ── Connect nodes to ring ────────────────────────────────────────────
      connectNodesToRing(leftNodes, ringCx, ringCy, rx, ry, "left");
      connectNodesToRing(rightNodes, ringCx, ringCy, rx, ry, "right");

      // ── Left nodes ────────────────────────────────────────────────────────
      drawNodes(leftNodes, t);
      drawNodes(rightNodes, t);

      // ── Avatar image ──────────────────────────────────────────────────────
      if (img.complete && img.naturalWidth > 0) {
        // Slight breathing scale
        const breathe = 1 + Math.sin(t * 0.5) * 0.003;
        const dw = faceW * breathe;
        const dh = faceH * breathe;
        const dx = faceX - (dw - faceW) / 2;
        const dy = faceY - (dh - faceH) / 2;

        ctx.save();
        // Eye glow overlay — project approximate eye positions
        const eyeLY = dy + dh * 0.38;
        const eyeRY = eyeLY;
        const eyeLX = dx + dw * 0.39;
        const eyeRX = dx + dw * 0.61;
        const eyeGlowSize = dw * 0.055;
        const eyeAlpha = 0.5 + Math.sin(t * 2.5) * 0.2;

        ctx.drawImage(img, dx, dy, dw, dh);

        // Blue eye glow on top of image
        [{ x: eyeLX, y: eyeLY }, { x: eyeRX, y: eyeRY }].forEach(eye => {
          const eg = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, eyeGlowSize);
          eg.addColorStop(0, `rgba(56,189,248,${eyeAlpha})`);
          eg.addColorStop(0.5, `rgba(56,189,248,${eyeAlpha * 0.3})`);
          eg.addColorStop(1, "rgba(56,189,248,0)");
          ctx.fillStyle = eg;
          ctx.beginPath();
          ctx.arc(eye.x, eye.y, eyeGlowSize, 0, Math.PI * 2);
          ctx.fill();
        });

        // Scan line over face
        drawScanLine(W / 2, faceY, faceH);
        ctx.restore();
      }

      // ── Data readout lines (left) ────────────────────────────────────────
      const textAlpha = 0.5 + Math.sin(t * 0.6) * 0.2;
      ctx.font = `700 ${Math.floor(H * 0.022)}px ${MONO}`;
      ctx.fillStyle = `rgba(56,189,248,${textAlpha})`;
      ctx.textAlign = "left";
      const lx = faceX - 4;
      const ty = faceY + faceH * 0.42;
      ctx.fillText("TETHER-BUBBLE 53", lx - Math.min(W * 0.14, 120), ty - faceH * 0.09);

      // Tick line from label to ring
      ctx.beginPath();
      ctx.moveTo(lx - Math.min(W * 0.14, 120), ty - faceH * 0.07);
      ctx.lineTo(lx - 6, ty - faceH * 0.07);
      ctx.strokeStyle = `rgba(56,189,248,${textAlpha * 0.5})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── Data readout lines (right) ───────────────────────────────────────
      ctx.textAlign = "right";
      const rx2 = faceX + faceW + 4;
      ctx.fillText("54-NODE TECOE PIPELINE", rx2 + Math.min(W * 0.14, 120), ty + faceH * 0.08);

      ctx.beginPath();
      ctx.moveTo(rx2 + Math.min(W * 0.14, 120), ty + faceH * 0.1);
      ctx.lineTo(rx2 + 6, ty + faceH * 0.1);
      ctx.strokeStyle = `rgba(56,189,248,${textAlpha * 0.5})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── Bottom telemetry ────────────────────────────────────────────────
      const telY = H - 14;
      const telItems = [
        { label: "PIPELINE", val: "420.69 ops/sec", color: "#D4AF37" },
        { label: "LAMPORT", val: "ORDERED", color: "#34D399" },
        { label: "EFTPS", val: "SECURED", color: "#34D399" },
        { label: "ZK-PROOF", val: "VERIFIED", color: "#A78BFA" },
        { label: "DRIFT", val: "0.00%", color: "#F59E0B" },
      ];
      const spacing = W / (telItems.length + 1);
      ctx.font = `700 ${Math.floor(H * 0.019)}px ${MONO}`;
      telItems.forEach((item, i) => {
        const tx = spacing * (i + 1);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(61,69,96,0.9)";
        ctx.font = `${Math.floor(H * 0.016)}px ${MONO}`;
        ctx.fillText(item.label, tx, telY - 14);
        ctx.fillStyle = item.color;
        ctx.font = `700 ${Math.floor(H * 0.019)}px ${MONO}`;
        ctx.fillText(item.val, tx, telY);
      });

      // ── Top banner ──────────────────────────────────────────────────────
      ctx.textAlign = "left";
      ctx.font = `700 ${Math.floor(H * 0.02)}px ${MONO}`;
      ctx.fillStyle = `rgba(56,189,248,${0.7 + Math.sin(t * 0.9) * 0.15})`;
      ctx.fillText("dAIsy haMINJA — SOVEREIGN CORE ACTIVE", 16, 22);

      // Corner markers
      const cm = 14;
      const c2d = ctx!;
      const corners = [[0, 0], [W, 0], [0, H], [W, H]] as [number, number][];
      corners.forEach(([cx, cy]) => {
        const sx = cx === 0 ? 1 : -1;
        const sy = cy === 0 ? 1 : -1;
        c2d.beginPath();
        c2d.moveTo(cx + sx * cm, cy);
        c2d.lineTo(cx, cy);
        c2d.lineTo(cx, cy + sy * cm);
        c2d.strokeStyle = "rgba(56,189,248,0.35)";
        c2d.lineWidth = 1.2;
        c2d.stroke();
      });
    }

    img.onload = () => {}; // trigger after load
    draw();

    function onResize() {
      if (!container || !canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      leftNodes = makeNodes("left");
      rightNodes = makeNodes("right");
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#02040e", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
