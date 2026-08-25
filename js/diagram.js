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
    dst:{fill:"#24292f",stroke:"#24292f",text:"#ffffff"},
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
    const nFull = Math.max(1, Math.floor(GBITS/sew));
    const nShow = Math.min(nFull, CAP);
    const W = 396, H = 30, gapA = 40;
    const ctxH = 22, labH = 16;
    const svgW = W + 16;
    const x = 8;
    const ew = W / nShow;
    const totalH = ctxH + labH + 24 + regs.length*(H+gapA) - gapA + 8;
    let s = `<svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}" xmlns="http://www.w3.org/2000/svg" role="img">`;
    if(spec.ctx) s += `<text x="${x+2}" y="13" font-size="10.5" fill="#57606a" font-family="${SANS}">${esc(spec.ctx)}</text>`;
    const bounds = [GBITS]; for(let k=1;k<nShow;k++) bounds.push(GBITS - k*sew); bounds.push(0);
    bounds.forEach((b,k)=>{
      const bx = x + k*ew;
      const anchor = k===0 ? 'start' : (k===nShow ? 'end' : 'middle');
      s += `<text x="${bx}" y="${ctxH+labH-3}" font-size="9.5" fill="#57606a" font-family="${MONO}" text-anchor="${anchor}">${b}</text>`;
    });
    let y = ctxH + labH + 24;
    regs.forEach((r,i)=>{
      const c = COLORS[r.cls || "src"];
      if(r.maskrow){
        s += `<text x="${x+2}" y="${y-7}" font-size="10.5" font-weight="600" fill="#0550ae" font-family="${SANS}">${esc(r.label)}${r.sub?` · ${esc(r.sub)}`:''}</text>`;
        s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.4"/>`;
        MASK.slice(0,nShow).forEach((b,k)=>{
          const bx = x+0.5+k*ew, bw = ew-1;
          s += `<rect x="${bx}" y="${y+0.5}" width="${bw}" height="${H-1}" fill="${b?'#0550ae':'#ffffff'}" stroke="#0550ae" stroke-width="0.6"/>`;
          s += `<text x="${bx+bw/2}" y="${y+H/2+3.5}" text-anchor="middle" font-size="9" fill="${b?'#ffffff':'#0550ae'}" font-family="${MONO}">${b}</text>`;
        });
      } else {
        s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.4"/>`;
        s += `<text x="${x+8}" y="${y+H/2+4}" font-size="12" font-weight="600" fill="${c.text}" font-family="${MONO}">${esc(r.label)}</text>`;
        if(r.sub) s += `<text x="${x+W-8}" y="${y+H/2+3}" font-size="10" fill="#6e7781" font-family="${SANS}" text-anchor="end">${esc(r.sub)}</text>`;
        for(let k=1;k<nShow;k++) s += `<line x1="${x+k*ew}" y1="${y}" x2="${x+k*ew}" y2="${y+H}" stroke="${r.cls==='dst'?'#9aa2ad':c.stroke}" stroke-opacity="${r.cls==='dst'?'0.65':'0.35'}" stroke-width="1"/>`;
        if(spec.applyMask) MASK.slice(0,nShow).forEach((b,k)=>{ if(!b) s += `<rect x="${x+k*ew}" y="${y}" width="${ew}" height="${H}" fill="${r.cls==='dst'?'#1c2128':'#d8dee4'}" fill-opacity="0.85"/>`; });
      }
      if(i < ops.length){
        const oy = y + H + 15;
        s += `<text x="${x+W/2}" y="${oy}" text-anchor="middle" font-size="17" fill="#57606a" font-family="${SANS}">${esc(ops[i])}</text>`;
      }
      y += H + gapA;
    });
    s += `</svg>`;
    container.innerHTML = s;
  }

  const grp = (n,e) => `${n}×${e}b`;
  const ctxS = (name, extra) => `VLEN=${VLEN} · LMUL=${LMUL} · ${name}${extra?` · ${extra}`:""}`;

  R.diagram = {
    render(container, inst){
      const key = inst.diagram;
      if(key === "fmadd"){ vflow(container, {
        ctx: "FMADD.S · scalar 32-bit FP",
        regs:[{label:"f[rs1]", sub:"32b"}, {label:"f[rs2]", sub:"32b"},
              {label:"f[rs3]", sub:"32b"}, {label:"f[rd]", sub:"result", cls:"dst"}],
        ops:["+","×","="],
      }); return; }
      const fn = this[key];
      if(fn) return fn.call(this, container, inst);
      container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px">Behavior diagram not generated yet.</div>`;
    },
    vadd(container){ vflow(container, {
      ctx: ctxS("vadd.vv · SEW=32 → 8 elements · vm=0"),
      regs:[{label:"vs2", sub:grp(8,32)}, {label:"vs1", sub:grp(8,32)},
            {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd", sub:grp(8,32), cls:"dst"}],
      ops:["+","","="], sew:32, applyMask:true,
    }); },
    vwadd(container){ vflow(container, {
      ctx: ctxS("vwadd.vv · widening 32b → 64b (2·LMUL) · vm=0"),
      regs:[{label:"vs2", sub:grp(8,32)}, {label:"vs1", sub:grp(8,32)},
            {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd", sub:"4×64b · 2·LMUL", cls:"dst"}],
      ops:["+","","="], sew:64, applyMask:true,
    }); },
    vnsrl(container){ vflow(container, {
      ctx: ctxS("vnsrl.wi · narrowing 64b → 32b · vm=0"),
      regs:[{label:"vs2", sub:"4×64b · 2·LMUL"}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd", sub:grp(8,32), cls:"dst"}],
      ops:["≫","="], sew:32, applyMask:true,
    }); },
    vfmacc(container){ vflow(container, {
      ctx: ctxS("vfmacc.vv · FP multiply-accumulate · SEW=32 · vm=0"),
      regs:[{label:"vs1", sub:grp(8,32)}, {label:"vs2", sub:grp(8,32)},
            {label:"vd", sub:"acc"}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vd = vs1·vs2 + vd", sub:grp(8,32), cls:"dst"}],
      ops:["×","+","","="], sew:32, applyMask:true,
    }); },
    vredsum(container){ vflow(container, {
      ctx: ctxS("vredsum.vs · reduce → scalar · vm=0"),
      regs:[{label:"vs2[0..vl-1]", sub:grp(8,32)}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"vs1[0]", sub:"scalar acc"}, {label:"vd[0]", sub:"scalar result", cls:"dst"}],
      ops:["Σ","","="], sew:32, applyMask:true,
    }); },
    vl(container, e, kind){
      const mem = kind==="unit" ? "mem[base+i]" : kind==="strided" ? "mem[base+i·stride]" : "mem[base+vs2[i]]";
      const N = Math.floor(GBITS/e);
      vflow(container, {
        ctx: ctxS(kind==="unit" ? `${e}-bit unit load` : kind==="strided" ? `${e}-bit strided load (stride=rs2)` : `${e}-bit indexed load (idx=vs2)`, "vm=0"),
        regs:[{label:mem, sub:`${N}×${e}b elements`, cls:"mem"}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
              {label:"vd", sub:grp(N,e), cls:"dst"}],
        ops:["→",""], sew:+(e), applyMask:true,
      });
    },
    vle8(container){ this.vl(container,"8","unit"); },
    vlse32(container){ this.vl(container,"32","strided"); },
    vluxei16(container){ this.vl(container,"16","indexed"); },
    vse16(container){ vflow(container, {
      ctx: ctxS("vse16.v · unit-stride 16-bit store · vm=0"),
      regs:[{label:"vs3", sub:grp(16,16)}, {label:"v0.t", sub:"1 bit/elem · vm=0", cls:"mask", maskrow:true},
            {label:"mem[base+i]", sub:"×16 elements", cls:"mem"}],
      ops:["","→"], sew:16, applyMask:true,
    }); },
  };
})();
