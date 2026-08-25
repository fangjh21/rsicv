/* Instruction behavior diagram: flat centered register strips.
 * Reference layout: VLEN = 128, LMUL = 2 → register group = 256 bits,
 * N = 256/SEW elements (display capped at 8). VLEN/LMUL/SEW shown on the diagram.
 */
window.RISCV = window.RISCV || {};
(function(){
  const R = window.RISCV;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const VLEN = 128, LMUL = 2, GBITS = VLEN*LMUL;
  const COLORS = {
    src:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
    dst:{fill:"#218bff",op:"0.28",stroke:"#0969da",text:"#0550ae"},
    mask:{fill:"#eef6ff",stroke:"#0550ae",text:"#0550ae"},
    mem:{fill:"#ffffff",stroke:"#57606a",text:"#57606a"},
  };
  const MONO = "ui-monospace,Menlo,Consolas,monospace";
  const SANS = "ui-sans-serif,system-ui,sans-serif";
  const CAP = 8;
  const MASK = [1,0,1,1,0,1,0,1];

  function vflow(container, spec){
    const regs = spec.regs, ops = spec.ops || [];
    const sew = spec.sew || 32;
    const nFull = spec.single ? 1 : Math.max(1, Math.floor(GBITS/sew));
    const nShow = spec.single ? 1 : Math.min(nFull, CAP);
    const W = 396, H = 30, gapA = 40;
    const M = 24;                       // symmetric side margin → strip centered in svg
    const svgW = W + 2*M;
    const x = M;
    const ew = W / nShow;
    const ctxLines = Array.isArray(spec.ctx) ? spec.ctx : [spec.ctx];
    const labelY = 13 + ctxLines.length*13.5 + 4;   // bit labels below ctx lines
    const y0 = labelY + 33;
    const stripBottom = y0 + regs.length*(H+gapA) - gapA;
    const legendY = stripBottom + 20;
    const totalH = spec.applyMask ? legendY + 8 : stripBottom + 8;
    let s = `<svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}" xmlns="http://www.w3.org/2000/svg" role="img">`;
    ctxLines.forEach((line,i)=>{
      if(!line) return;
      s += `<text x="${x+2}" y="${13+i*13.5}" font-size="${i===0?'10.5':'10'}" fill="${i===0?'#57606a':'#8b949e'}" font-family="${SANS}">${esc(line)}</text>`;
    });
    // labels: register size at top, then MSB of each element, then 0
    const bounds = spec.single ? [sew-1, 0] : (()=>{
      const b = [GBITS];
      for(let k=1;k<nShow;k++) b.push(GBITS - 1 - k*sew);
      if(nShow === nFull) b.push(0);
      return b;
    })();
    bounds.forEach((b,k)=>{
      const bx = x + k*ew;
      const anchor = k===0 ? 'start' : (k===nShow ? 'end' : 'middle');
      s += `<text x="${bx}" y="${labelY}" font-size="9.5" fill="#57606a" font-family="${MONO}" text-anchor="${anchor}">${b}</text>`;
    });
    let y = y0;
    regs.forEach((r,i)=>{
      const c = COLORS[r.cls || "src"];
      // name + sub ABOVE the strip (not on the cells)
      s += `<text x="${x}" y="${y-6}" font-size="11" font-weight="600" fill="${c.text}" font-family="${MONO}">${esc(r.label)}</text>`;
      if(r.sub) s += `<text x="${x+W}" y="${y-6}" font-size="10" fill="#6e7781" font-family="${SANS}" text-anchor="end">${esc(r.sub)}</text>`;
      // strip
      s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${c.fill}"${c.op?` fill-opacity="${c.op}"`:""} stroke="${c.stroke}" stroke-width="1.4"/>`;
      if(r.maskrow){
        MASK.slice(0,nShow).forEach((b,k)=>{
          const bx = x+0.5+k*ew, bw = ew-1;
          s += `<rect x="${bx}" y="${y+0.5}" width="${bw}" height="${H-1}" fill="${b?'#0550ae':'#ffffff'}" stroke="#0550ae" stroke-width="0.6"/>`;
          s += `<text x="${bx+bw/2}" y="${y+H/2+3.5}" text-anchor="middle" font-size="9" fill="${b?'#ffffff':'#0550ae'}" font-family="${MONO}">${b}</text>`;
        });
      } else {
        // masked-off overlay first, then division lines on top
        if(spec.applyMask) MASK.slice(0,nShow).forEach((b,k)=>{ if(!b) s += `<rect x="${x+k*ew+0.5}" y="${y+0.5}" width="${ew-1}" height="${H-1}" fill="${r.cls==='dst'?'#d0d7de':'#d8dee4'}" fill-opacity="0.9"/>`; });
        for(let k=1;k<nShow;k++) s += `<line x1="${x+k*ew}" y1="${y}" x2="${x+k*ew}" y2="${y+H}" stroke="${c.stroke}" stroke-opacity="0.35" stroke-width="1"/>`;
      }
      if(nFull > nShow && !r.maskrow) s += `<text x="${x+W}" y="${y+H-4}" font-size="9" fill="${c.text}" fill-opacity="0.5" font-family="${SANS}" text-anchor="end">… ×${nFull}</text>`;
      if(i < ops.length){
        const oy = y + H + 14;
        s += `<text x="${x+W/2}" y="${oy}" text-anchor="middle" font-size="17" fill="#57606a" font-family="${SANS}">${esc(ops[i])}</text>`;
      }
      y += H + gapA;
    });
    if(spec.applyMask) s += `<text x="${x+2}" y="${legendY}" font-size="9.5" fill="#57606a" font-family="${SANS}">grey cell = element masked off (v0.t = 0 · vm = 0); light blue = result written</text>`;
    s += `</svg>`;
    container.innerHTML = s;
  }

  const grp = (n,e) => `${n}×${e}b`;
  const ctxS = (name) => [name, `VLEN=${VLEN} · LMUL=${LMUL} → each strip = a register group = ${GBITS} bits · masked with v0.t (vm=0)`];

  R.diagram = {
    render(container, inst){
      const key = inst.diagram;
      if(key === "fmadd"){ vflow(container, {
        ctx: "FMADD.S · fused scalar FP multiply-add: f[rd] = f[rs1] × f[rs2] + f[rs3]",
        regs:[{label:"f[rs1]", sub:"32b"}, {label:"f[rs2]", sub:"32b"},
              {label:"f[rs3]", sub:"32b"}, {label:"f[rd]", sub:"result", cls:"dst"}],
        ops:["×","+","="], sew:32, single:true,
      }); return; }
      const fn = this[key];
      if(fn) return fn.call(this, container, inst);
      container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px">Behavior diagram not generated yet.</div>`;
    },
    vadd(container){ vflow(container, {
      ctx: ctxS("vadd.vv · element-wise add of 8 × 32b"),
      regs:[{label:"vs2", sub:grp(8,32)}, {label:"vs1", sub:grp(8,32)},
            {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd", sub:grp(8,32), cls:"dst"}],
      ops:["+","","="], sew:32, applyMask:true,
    }); },
    vwadd(container){ vflow(container, {
      ctx: ctxS("vwadd.vv · widening add: 32b + 32b → 64b"),
      regs:[{label:"vs2", sub:grp(8,32)}, {label:"vs1", sub:grp(8,32)},
            {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd", sub:"4×64b · 2·LMUL", cls:"dst"}],
      ops:["+","","="], sew:64, applyMask:true,
    }); },
    vnsrl(container){ vflow(container, {
      ctx: ctxS("vnsrl.wi · narrowing shift: 64b → 32b"),
      regs:[{label:"vs2", sub:"4×64b · 2·LMUL"}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd", sub:grp(8,32), cls:"dst"}],
      ops:["≫","="], sew:32, applyMask:true,
    }); },
    vfmacc(container){ vflow(container, {
      ctx: ctxS("vfmacc.vv · FP multiply-accumulate: vs1 × vs2 + vd"),
      regs:[{label:"vs1", sub:grp(8,32)}, {label:"vs2", sub:grp(8,32)},
            {label:"vd", sub:"acc"}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd = vs1·vs2 + vd", sub:grp(8,32), cls:"dst"}],
      ops:["×","+","","="], sew:32, applyMask:true,
    }); },
    vredsum(container){ vflow(container, {
      ctx: ctxS("vredsum.vs · reduce all elements into one scalar"),
      regs:[{label:"vs2[0..vl-1]", sub:grp(8,32)}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vs1[0]", sub:"scalar acc"}, {label:"vd[0]", sub:"scalar result", cls:"dst"}],
      ops:["Σ","","="], sew:32, applyMask:true,
    }); },
    vl(container, e, kind){
      const mem = kind==="unit" ? "mem[base+i]" : kind==="strided" ? "mem[base+i·stride]" : "mem[base+vs2[i]]";
      const N = Math.floor(GBITS/e);
      const op = kind==="unit" ? `vle${e}.v · unit-stride load: ${N} × ${e}b elements`
               : kind==="strided" ? `vlse${e}.v · strided load (stride = rs2): ${N} × ${e}b elements`
               : `vluxei${e}.v · indexed load (index = vs2): ${N} × ${e}b elements`;
      vflow(container, {
        ctx: ctxS(op),
        regs:[{label:mem, sub:`${N}×${e}b elements`, cls:"mem"}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
              {label:"vd", sub:grp(N,e), cls:"dst"}],
        ops:["→",""], sew:+(e), applyMask:true,
      });
    },
    vle8(container){ this.vl(container,"8","unit"); },
    vlse32(container){ this.vl(container,"32","strided"); },
    vluxei16(container){ this.vl(container,"16","indexed"); },
    vse16(container){ vflow(container, {
      ctx: ctxS("vse16.v · unit-stride store: 16 × 16b elements"),
      regs:[{label:"vs3", sub:grp(16,16)}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"mem[base+i]", sub:"×16 elements", cls:"mem"}],
      ops:["","→"], sew:16, applyMask:true,
    }); },
  };
})();
