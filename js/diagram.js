/* Instruction behavior diagram: element-level bit-width flow.
 * Shows which source element (and its bit width) combines with which, and the
 * resulting element (and its bit width) — nothing else.
 */
window.RISCV = window.RISCV || {};
(function(){
  const R = window.RISCV;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const COLORS = {
    src:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
    dst:{fill:"#24292f",stroke:"#24292f",text:"#ffffff"},
    calc:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
    key:{fill:"#ffffff",stroke:"#0550ae",text:"#0550ae"},
    note:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
  };

  function borderPoint(n, tx, ty){
    const cx = n.x + n.w/2, cy = n.y + n.h/2;
    let dx = tx - cx, dy = ty - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx/len, uy = dy/len;
    const txr = ux === 0 ? Infinity : (n.w/2)/Math.abs(ux);
    const tyr = uy === 0 ? Infinity : (n.h/2)/Math.abs(uy);
    const t = Math.min(txr, tyr);
    return {x: cx + ux*t, y: cy + uy*t};
  }

  function renderFlow(container, spec){
    const {w, h, nodes, edges} = spec;
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">`;
    s += `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6e7781"/></marker></defs>`;
    for(const e of edges){
      const a = byId[e[0]], b = byId[e[1]];
      const p1 = borderPoint(a, b.x + b.w/2, b.y + b.h/2);
      const p2 = borderPoint(b, a.x + a.w/2, a.y + a.h/2);
      s += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#6e7781" stroke-width="1.6" marker-end="url(#arr)"/>`;
    }
    for(const n of nodes){
      const c = COLORS[n.cls || "calc"];
      s += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>`;
      const cx = n.x + n.w/2, cy = n.y + n.h/2;
      s += `<text x="${cx}" y="${cy-3}" text-anchor="middle" font-size="13" fill="${c.text}" font-family="ui-monospace,Menlo,Consolas,monospace">${esc(n.label)}</text>`;
      s += `<text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="11" fill="#6e7781" font-family="ui-sans-serif,system-ui,sans-serif">${esc(n.sub||'')}</text>`;
    }
    s += `</svg>`;
    container.innerHTML = s;
  }

  /* generic: sources (label+width) → op → result (label+width) */
  function elem(container, spec){
    const n = spec.sources.length;
    const H = 54, gap = 90;
    const srcX = 40, opX = 352, resX = 700;
    const totalH = n*H + (n-1)*gap;
    const nodes = [], edges = [];
    spec.sources.forEach((s,i) => {
      const id = "s"+i;
      nodes.push({id, x:srcX, y:18 + i*(H+gap), w:168, h:H, label:s.label, sub:s.width, cls:"src"});
      edges.push([id, "op"]);
    });
    const opY = 18 + (totalH - 82)/2;
    nodes.push({id:"op", x:opX, y:opY, w:216, h:82, label:spec.op.label, sub:spec.op.sub, cls:"key"});
    nodes.push({id:"res", x:resX, y:opY, w:168, h:H, label:spec.result.label, sub:spec.result.width, cls:"dst"});
    edges.push(["op","res"]);
    renderFlow(container, {w:930, h:totalH+40, nodes, edges});
  }

  R.diagram = {
    render(container, inst){
      if(inst.diagram === "fmadd") return this.fmadd(container);
      if(inst.diagram === "vadd")  return this.vadd(container);
      if(inst.diagram === "vwadd") return this.vwadd(container);
      if(inst.diagram === "vnsrl") return this.vnsrl(container);
      container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px">Behavior diagram not generated yet.</div>`;
    },
    fmadd(container){
      elem(container, {
        sources:[{label:"f[rs1]", width:"32-bit"}, {label:"f[rs2]", width:"32-bit"}, {label:"f[rs3]", width:"32-bit"}],
        op:{label:"FMADD.S", sub:"rd = (rs1 × rs2) + rs3  ·  single rounding"},
        result:{label:"f[rd]", width:"32-bit"},
      });
    },
    vadd(container){
      elem(container, {
        sources:[{label:"vs2[i]", width:"SEW"}, {label:"vs1[i]", width:"SEW"}],
        op:{label:"vadd.vv", sub:"vd[i] = vs2[i] + vs1[i]"},
        result:{label:"vd[i]", width:"SEW"},
      });
    },
    vwadd(container){
      elem(container, {
        sources:[{label:"vs2[i]", width:"SEW"}, {label:"vs1[i]", width:"SEW"}],
        op:{label:"vwadd.vv", sub:"widening: vd[i] = vs2[i] + vs1[i]"},
        result:{label:"vd[i]", width:"2·SEW"},
      });
    },
    vnsrl(container){
      elem(container, {
        sources:[{label:"vs2[i]", width:"2·SEW"}],
        op:{label:"vnsrl.wi", sub:"narrowing: vd[i] = vs2[i] >> uimm"},
        result:{label:"vd[i]", width:"SEW"},
      });
    },
  };
})();
