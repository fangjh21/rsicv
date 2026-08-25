/* Instruction behavior diagram: vertical vector-element flow.
 * Shows the vector register group (VLEN·LMUL bits) with its elements (SEW),
 * the operand masks (v0.t / vm), and the element-wise operation → result.
 */
window.RISCV = window.RISCV || {};
(function(){
  const R = window.RISCV;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const COLORS = {
    src:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
    dst:{fill:"#24292f",stroke:"#24292f",text:"#ffffff"},
    mask:{fill:"#eef6ff",stroke:"#0550ae",text:"#0550ae"},
    key:{fill:"#ffffff",stroke:"#0550ae",text:"#0550ae"},
  };
  const MONO = "ui-monospace,Menlo,Consolas,monospace";
  const SANS = "ui-sans-serif,system-ui,sans-serif";

  function vflow(container, spec){
    const rows = spec.rows, ops = spec.ops || [];
    const W = 330, H = 50, gap = 36;
    const ctxH = spec.ctx ? 24 : 0;
    const totalH = ctxH + rows.length*H + (rows.length-1)*gap + 10;
    const svgW = W + 76;
    let s = `<svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}" xmlns="http://www.w3.org/2000/svg" role="img">`;
    const x = 34;
    if(spec.ctx){
      s += `<text x="${x-4}" y="15" font-size="10.5" fill="#57606a" font-family="${SANS}">${esc(spec.ctx)}</text>`;
    }
    let y = ctxH + 12;
    rows.forEach((r,i)=>{
      const c = COLORS[r.cls || "src"];
      s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="0" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.4"/>`;
      s += `<text x="${x+W/2}" y="${y+H/2-2}" text-anchor="middle" font-size="14" fill="${c.text}" font-family="${MONO}">${esc(r.label)}</text>`;
      if(r.sub) s += `<text x="${x+W/2}" y="${y+H/2+14}" text-anchor="middle" font-size="10" fill="#6e7781" font-family="${SANS}">${esc(r.sub)}</text>`;
      if(r.elems && r.elems <= 12){
        const ew = (W-8)/r.elems;
        for(let k=1;k<r.elems;k++){
          s += `<line x1="${x+4+k*ew}" y1="${y+6}" x2="${x+4+k*ew}" y2="${y+H-6}" stroke="${c.stroke}" stroke-opacity="0.22" stroke-width="1"/>`;
        }
      }
      if(i < ops.length){
        const oy = y + H + 17;
        s += `<text x="${x+W/2}" y="${oy}" text-anchor="middle" font-size="18" fill="#57606a" font-family="${SANS}">${esc(ops[i])}</text>`;
      }
      y += H + gap;
    });
    s += `</svg>`;
    container.innerHTML = s;
  }

  const GROUP = "V group · N × SEW = VLEN·LMUL bits";
  const MASK  = "mask: 1 bit/element · vm=0 → v0.t, vm=1 → all active";
  const RES   = "V group · VLEN·LMUL bits";

  R.diagram = {
    render(container, inst){
      const key = inst.diagram;
      if(key === "fmadd"){
        vflow(container, {
          ctx: "scalar FP · single element",
          rows:[{label:"f[rs1]", sub:"32-bit FP"},
                {label:"f[rs2]", sub:"32-bit FP"},
                {label:"f[rs3]", sub:"32-bit FP"},
                {label:"f[rd]", sub:"32-bit FP", cls:"dst"}],
          ops:["+","×","="],
        });
        return;
      }
      const fn = this[key];
      if(fn) return fn.call(this, container, inst);
      container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px">Behavior diagram not generated yet.</div>`;
    },
    /* --- element-wise --- */
    vadd(container){ vflow(container, {
      ctx: "VLEN · LMUL · SEW  —  N = (VLEN·LMUL)/SEW elements per register group",
      rows:[{label:"vs2", sub:GROUP, elems:8},
            {label:"vs1", sub:GROUP, elems:8},
            {label:"v0.t", sub:MASK, cls:"mask"},
            {label:"vd", sub:RES+" · SEW each", cls:"dst", elems:8}],
      ops:["+","","="],
    }); },
    vwadd(container){ vflow(container, {
      ctx: "widening: result element = 2·SEW · result group = 2·LMUL registers",
      rows:[{label:"vs2", sub:"V group · SEW", elems:8},
            {label:"vs1", sub:"V group · SEW", elems:8},
            {label:"v0.t", sub:MASK, cls:"mask"},
            {label:"vd", sub:"V group · 2·SEW each · 2·LMUL regs", cls:"dst", elems:4}],
      ops:["+","","="],
    }); },
    vnsrl(container){ vflow(container, {
      ctx: "narrowing: source element = 2·SEW · result element = SEW",
      rows:[{label:"vs2", sub:"V group · 2·SEW · 2·LMUL regs", elems:4},
            {label:"v0.t", sub:MASK, cls:"mask"},
            {label:"vd", sub:"V group · SEW each", cls:"dst", elems:8}],
      ops:["≫","="],
    }); },
    vfmacc(container){ vflow(container, {
      ctx: "FP fused multiply-accumulate · SEW",
      rows:[{label:"vs1", sub:GROUP, elems:8},
            {label:"vs2", sub:GROUP, elems:8},
            {label:"vd", sub:"accumulator · "+GROUP, cls:"src", elems:8},
            {label:"v0.t", sub:MASK, cls:"mask"},
            {label:"vd", sub:RES+" · SEW each", cls:"dst", elems:8}],
      ops:["×","+","","="],
    }); },
    vredsum(container){ vflow(container, {
      ctx: "reduction: vector elements summed into a scalar",
      rows:[{label:"vs2[0..vl-1]", sub:"V group · SEW", elems:8},
            {label:"vs1[0]", sub:"SEW (scalar accumulator)"},
            {label:"vd[0]", sub:"SEW (reduced result)", cls:"dst"}],
      ops:["Σ","="],
    }); },
    /* --- loads / stores --- */
    vl(container, e, kind){
      const base = kind==="unit" ? "mem[base + i]" : kind==="strided" ? "mem[base + i·stride]" : "mem[base + vs2[i]]";
      vflow(container, {
        ctx: kind==="unit" ? "unit-stride load · VLEN · LMUL · 1 × "+e+"-bit per element"
             : kind==="strided" ? "strided load · stride in rs2 · element "+e+"-bit"
             : "indexed load · index in vs2 · element "+e+"-bit",
        rows:[{label:base, sub:e+"-bit element"},
              {label:"v0.t", sub:MASK, cls:"mask"},
              {label:"vd", sub:RES+" · "+e+"-bit each", cls:"dst", elems:8}],
        ops:["→",""],
      });
    },
    vle8(container){ this.vl(container,"8","unit"); },
    vse16(container){ vflow(container, {
      ctx: "unit-stride store · element 16-bit · VS3 registers hold the data",
      rows:[{label:"vs3[i]", sub:"16-bit element", elems:8},
            {label:"v0.t", sub:MASK, cls:"mask"},
            {label:"mem[base + i]", sub:"16-bit element", cls:"dst"}],
      ops:["","→"],
    }); },
    vlse32(container){ this.vl(container,"32","strided"); },
    vluxei16(container){ this.vl(container,"16","indexed"); },
  };
})();
