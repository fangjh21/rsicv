/* Instruction behavior diagram: register strips with bit-index labels.
 * Reference layout: VLEN = 128, LMUL = 2 → register group = 256 bits,
 * N = 256/SEW elements per group (displayed capped at 8).
 */
window.RISCV = window.RISCV || {};
(function(){
  const R = window.RISCV;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const VLEN = 128, LMUL = 2, GBITS = VLEN*LMUL;      // 256-bit register group
  const COLORS = {
    src:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
    dst:{fill:"#24292f",stroke:"#24292f",text:"#ffffff"},
    mask:{fill:"#eef6ff",stroke:"#0550ae",text:"#0550ae"},
    mem:{fill:"#ffffff",stroke:"#57606a",text:"#57606a"},
  };
  const MONO = "ui-monospace,Menlo,Consolas,monospace";
  const SANS = "ui-sans-serif,system-ui,sans-serif";
  const CAP = 8;
  const MASK = [1,0,1,1,0,1,0,1];   // representative v0.t pattern (1 = active element)

  function vflow(container, spec){
    const regs = spec.regs, ops = spec.ops || [];
    const sew = spec.sew || 32;
    const nFull = Math.max(1, Math.floor(GBITS/sew));
    const nShow = Math.min(nFull, CAP);
    const W = 400, H = 30, gapA = 42;
    const ctxH = spec.ctx ? 26 : 0, labH = 16;
    const totalH = ctxH + labH + regs.length*(H+gapA) - gapA + 12;
    const svgW = W + 64;
    const x = 30, ew = W/nShow;
    let s = `<svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}" xmlns="http://www.w3.org/2000/svg" role="img">`;
    if(spec.ctx) s += `<text x="${x-4}" y="14" font-size="10.5" fill="#57606a" font-family="${SANS}">${esc(spec.ctx)}</text>`;
    // bit-index labels (GBITS, boundaries, 0)
    const bounds = [GBITS];
    for(let k=1;k<nShow;k++) bounds.push(GBITS - k*sew);
    bounds.push(0);
    bounds.forEach((b,k)=>{
      const bx = x + k*ew;
      s += `<text x="${bx}" y="${ctxH+labH-3}" font-size="9.5" fill="#57606a" font-family="${MONO}" text-anchor="${k===0?'start':(k===nShow?'end':'middle')}">${b}</text>`;
    });
    let y = ctxH + labH + 2;
    regs.forEach((r,i)=>{
      const c = COLORS[r.cls || "src"];
      const ry = y;
      s += `<text x="${x}" y="${ry-4}" font-size="12" font-weight="600" fill="${c.text}" font-family="${MONO}">${esc(r.label)}</text>`;
      if(r.sub) s += `<text x="${x+W}" y="${ry-4}" font-size="10" fill="#6e7781" font-family="${SANS}" text-anchor="end">${esc(r.sub)}</text>`;
      s += `<rect x="${x}" y="${ry}" width="${W}" height="${H}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.4"/>`;
      for(let k=1;k<nShow;k++) s += `<line x1="${x+k*ew}" y1="${ry}" x2="${x+k*ew}" y2="${ry+H}" stroke="${c.stroke}" stroke-opacity="0.35" stroke-width="1"/>`;
      if(r.maskrow){ // v0.t: one bit per element (1 = active)
        MASK.slice(0,nShow).forEach((b,k)=>{
          const bx = x+0.5+k*ew, bw = ew-1;
          s += `<rect x="${bx}" y="${ry+0.5}" width="${bw}" height="${H-1}" fill="${b?'#0550ae':'#ffffff'}" stroke="#0550ae" stroke-width="0.6"/>`;
          s += `<text x="${bx+bw/2}" y="${ry+H/2+3.5}" text-anchor="middle" font-size="9" fill="${b?'#ffffff':'#0550ae'}" font-family="${MONO}">${b}</text>`;
        });
      } else if(spec.applyMask){ // dim elements masked off (v0.t = 0)
        MASK.slice(0,nShow).forEach((b,k)=>{ if(!b) s += `<rect x="${x+k*ew}" y="${ry}" width="${ew}" height="${H}" fill="${c.fill}" fill-opacity="0.22"/>`; });
      }
      if(nFull > nShow) s += `<text x="${x+W-4}" y="${ry+H-6}" font-size="9" fill="${c.text}" fill-opacity="0.5" font-family="${SANS}" text-anchor="end">… ×${nFull}</text>`;
      if(i < ops.length){
        const oy = ry + H + 16;
        s += `<text x="${x+W/2}" y="${oy}" text-anchor="middle" font-size="18" fill="#57606a" font-family="${SANS}">${esc(ops[i])}</text>`;
      }
      y += H + gapA;
    });
    s += `</svg>`;
    container.innerHTML = s;
  }

  const ctxS = (name, extra) => `VLEN=${VLEN} · LMUL=${LMUL} · group ${GBITS} bits · ` + (extra || "") + name;
  const grp = speak => `${GBITS} bits · ${speak}`;

  R.diagram = {
    render(container, inst){
      const key = inst.diagram;
      if(key === "fmadd"){ vflow(container, {
        ctx: "scalar FP · 32-bit single element",
        regs:[{label:"f[rs1]", sub:"32-bit"}, {label:"f[rs2]", sub:"32-bit"},
              {label:"f[rs3]", sub:"32-bit"}, {label:"f[rd]", sub:"result", cls:"dst"}],
        ops:["+","×","="], sew:32,
      }); return; }
      const fn = this[key];
      if(fn) return fn.call(this, container, inst);
      container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px">Behavior diagram not generated yet.</div>`;
    },
    vadd(container){ vflow(container, {
      ctx: ctxS("vadd.vv · SEW=32 → 8 elements · vm=0 (masked by v0.t)"),
      regs:[{label:"vs2", sub:"8×32-bit"}, {label:"vs1", sub:"8×32-bit"},
            {label:"v0.t", sub:"mask bit per element (vm=0, 1=active)", cls:"mask", maskrow:true},
            {label:"vd", sub:"8×32-bit", cls:"dst"}],
      ops:["+","","="], sew:32, applyMask:true,
    }); },
    vwadd(container){ vflow(container, {
      ctx: ctxS("vwadd.vv · widening: source 32-bit → result 64-bit (2·LMUL) · vm=0"),
      regs:[{label:"vs2", sub:"8×32-bit"}, {label:"vs1", sub:"8×32-bit"},
            {label:"v0.t", sub:"mask bit per element (vm=0)", cls:"mask", maskrow:true},
            {label:"vd", sub:"4×64-bit · 2·LMUL", cls:"dst"}],
      ops:["+","","="], sew:64, applyMask:true,
    }); },
    vnsrl(container){ vflow(container, {
      ctx: ctxS("vnsrl.wi · narrowing: source 64-bit → result 32-bit · vm=0"),
      regs:[{label:"vs2", sub:"4×64-bit"}, {label:"v0.t", sub:"mask bit per element (vm=0)", cls:"mask", maskrow:true},
            {label:"vd", sub:"8×32-bit", cls:"dst"}],
      ops:["≫","="], sew:32, applyMask:true,
    }); },
    vfmacc(container){ vflow(container, {
      ctx: ctxS("vfmacc.vv · FP multiply-accumulate · SEW=32 · vm=0"),
      regs:[{label:"vs1", sub:"8×32-bit"}, {label:"vs2", sub:"8×32-bit"},
            {label:"vd", sub:"accumulator"}, {label:"v0.t", sub:"mask bit per element (vm=0)", cls:"mask", maskrow:true},
            {label:"vd = vs1·vs2 + vd", sub:"8×32-bit", cls:"dst"}],
      ops:["×","+","","="], sew:32, applyMask:true,
    }); },
    vredsum(container){ vflow(container, {
      ctx: ctxS("vredsum.vs · reduce vector to scalar · vm=0"),
      regs:[{label:"vs2[0..vl-1]", sub:"8×32-bit"}, {label:"v0.t", sub:"mask bit per element (vm=0)", cls:"mask", maskrow:true},
            {label:"vs1[0]", sub:"scalar acc"}, {label:"vd[0]", sub:"scalar result", cls:"dst"}],
      ops:["Σ","","="], sew:32, applyMask:true,
    }); },
    vl(container, e, kind){
      const mem = kind==="unit" ? "mem[base + i]" : kind==="strided" ? "mem[base + i·stride]" : "mem[base + vs2[i]]";
      vflow(container, {
        ctx: ctxS(kind==="unit" ? `${e}-bit unit-stride load` : kind==="strided" ? `${e}-bit strided load (stride=rs2)` : `${e}-bit indexed load (index=vs2)`),
        regs:[{label:mem, sub:`×${Math.floor(GBITS/e)} elements`, cls:"mem"},
              {label:"v0.t", sub:"mask bit per element (vm=0)", cls:"mask", maskrow:true},
              {label:"vd", sub:grp(`${Math.floor(GBITS/e)}×${e}-bit`), cls:"dst"}],
        ops:["→",""], sew:+(e), applyMask:true,
      });
    },
    vle8(container){ this.vl(container,"8","unit"); },
    vlse32(container){ this.vl(container,"32","strided"); },
    vluxei16(container){ this.vl(container,"16","indexed"); },
    vse16(container){ vflow(container, {
      ctx: ctxS("vse16.v · unit-stride 16-bit store · vm=0"),
      regs:[{label:"vs3", sub:grp("16×16-bit")}, {label:"v0.t", sub:"mask bit per element (vm=0)", cls:"mask", maskrow:true},
            {label:"mem[base + i]", sub:"×16 elements", cls:"mem"}],
      ops:["","→"], sew:16, applyMask:true,
    }); },
  };
})();
