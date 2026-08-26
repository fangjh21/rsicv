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
    dst:{fill:"#ddf4ff",stroke:"#0969da",text:"#0550ae"},
    mask:{fill:"#eef6ff",stroke:"#0550ae",text:"#0550ae"},
    mem:{fill:"#ffffff",stroke:"#57606a",text:"#57606a"},
  };
  const MONO = "ui-monospace,Menlo,Consolas,monospace";
  const SANS = "ui-sans-serif,system-ui,sans-serif";
  const CAP = 8;
  const SW = 99;               // scalar box width (32b / XLEN registers are small, not a full group)
  const MASK = [1,0,1,1,0,1,0,1];

  const rowCells = sew => Math.min(Math.max(1, Math.floor(GBITS/sew)), CAP);

  function vflow(container, spec){
    const regs = spec.regs, ops = spec.ops || [];
    const sew = spec.sew || 32;
    const W = 396, H = 30;
    const M = 24;                       // symmetric side margin → strip centered in svg
    const PX = W/256;                   // pixels per bit: 32b element = 49.5px, 64b = 99px
    const x = M;
    const ctxLines = Array.isArray(spec.ctx) ? spec.ctx : [spec.ctx];
    const labelY = 13 + ctxLines.length*13.5 + 4;   // bit labels below ctx lines
    const y0 = labelY + 33;
    // proportional geometry per row
    const geo = regs.map((r,i)=>{
      if(r.single){
        const s2 = r.sew || sew;
        return {n:1, cw:s2*PX, rw:s2*PX};
      }
      let ref = r, s2 = r.sew || sew, b2 = r.bits || GBITS;
      if(r.maskrow){
        ref = null;
        for(let j=i+1;j<regs.length;j++){ if(!regs[j].maskrow){ ref = regs[j]; break; } }
        if(!ref) for(let j=i-1;j>=0;j--){ if(!regs[j].maskrow){ ref = regs[j]; break; } }
        s2 = ref ? (ref.sew || sew) : sew; b2 = ref ? (ref.bits || GBITS) : GBITS;
      }
      const n = Math.min(Math.max(1, Math.floor(b2/s2)), CAP);
      return {n, cw:s2*PX, rw:n*s2*PX, s2};
    });
    const maxRW = Math.max(...geo.map(g=>g.rw));
    const cwEst = str => { let w = 0; for(const ch of str) w += (ch>="0"&&ch<="9")||"wmWM".includes(ch) ? 0.62 : (ch===" " ? 0.3 : 0.56); return w; };
    const textW = Math.max(0, ...ctxLines.map((l,i)=> l ? cwEst(l)*(i===0?10.5:10) : 0),
      spec.applyMask ? cwEst("grey = skipped (mask bit 0, vm = 0); light blue = written; vm = 1 → no mask")*9.5 : 0);
    const svgW = Math.round((Math.max(maxRW, textW) + 2*M)*10)/10;
    const desc = regs.map((r,i)=> r.maskrow ? "mask" : `${r.single?"1":"0"}|${r.sew||sew}|${r.bits||GBITS}|${geo[i].n}`);
    const shared = !spec.nolabels && desc[0] !== "mask" && desc.every(d => d === desc[0]);
    const gapA = shared ? 40 : 56;      // per-row labels need room under the op symbol
    const stripBottom = y0 + regs.length*(H+gapA) - gapA;
    const legendY = stripBottom + 20;
    const totalH = spec.applyMask ? legendY + 8 : stripBottom + 8;
    const labelsFor = (c, rsew, rbits) => c === 1 ? [rsew-1, 0] : (()=>{
      const b = [rbits-1];
      for(let k=1;k<c;k++) b.push(rbits - 1 - k*rsew);
      b.push(0);
      return b;
    })();
    let s = `<svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}" xmlns="http://www.w3.org/2000/svg" role="img">`;
    ctxLines.forEach((line,i)=>{
      if(!line) return;
      s += `<text x="${x+2}" y="${13+i*13.5}" font-size="${i===0?'10.5':'10'}" fill="${i===0?'#57606a':'#8b949e'}" font-family="${SANS}">${esc(line)}</text>`;
    });
    if(shared && geo[0].cw >= 34){   // cells too narrow (8b/16b) → labels would collide; rely on subs
      const g0 = geo[0];
      labelsFor(g0.n, sew, GBITS).forEach((b,k)=>{
        const bx = x + k*g0.cw;
        const anchor = k===0 ? 'start' : (k===g0.n ? 'end' : 'middle');
        s += `<text x="${bx}" y="${labelY}" font-size="9.5" fill="#57606a" font-family="${MONO}" text-anchor="${anchor}">${b}</text>`;
      });
    }
    let y = y0;
    regs.forEach((r,i)=>{
      const c = COLORS[r.cls || "src"], g = geo[i], cw = g.cw, rw = g.rw;
      if(!shared && g.n > 1 && !r.maskrow && cw >= 34){
        labelsFor(g.n, g.s2, r.bits || GBITS).forEach((b,k)=>{
          const bx = x + k*cw;
          const anchor = k===0 ? 'start' : (k===g.n ? 'end' : 'middle');
          s += `<text x="${bx}" y="${y-19}" font-size="9.5" fill="#57606a" font-family="${MONO}" text-anchor="${anchor}">${b}</text>`;
        });
      }
      // name + sub ABOVE the strip (not on the cells)
      s += `<text x="${x}" y="${y-6}" font-size="11" font-weight="600" fill="${c.text}" font-family="${MONO}">${esc(r.label)}</text>`;
      if(r.sub) s += (r.single || rw < 240)
        ? `<text x="${x + Math.max(rw + 10, String(r.label).length*11*0.62 + 10)}" y="${y-6}" font-size="10" fill="#6e7781" font-family="${SANS}">${esc(r.sub)}</text>`
        : `<text x="${x+rw}" y="${y-6}" font-size="10" fill="#6e7781" font-family="${SANS}" text-anchor="end">${esc(r.sub)}</text>`;
      // strip
      s += `<rect x="${x}" y="${y}" width="${rw}" height="${H}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.4"/>`;
      if(r.maskrow){
        MASK.slice(0,g.n).forEach((b,k)=>{
          const bx = x+k*cw, bw = cw;
          s += `<rect x="${bx}" y="${y+0.5}" width="${bw}" height="${H-1}" fill="${b?'#0550ae':'#ffffff'}" stroke="#0550ae" stroke-width="0.75"/>`;
          s += `<text x="${bx+bw/2}" y="${y+H/2+3.5}" text-anchor="middle" font-size="9" fill="${b?'#ffffff':'#0550ae'}" font-family="${MONO}">${b}</text>`;
        });
      } else {
        // masked-off overlay first, then division lines on top
        if(spec.applyMask) MASK.slice(0,g.n).forEach((b,k)=>{ if(!b) s += `<rect x="${x+k*cw+0.5}" y="${y+0.5}" width="${cw-1}" height="${H-1}" fill="#d8dee4" fill-opacity="0.9"/>`; });
        for(let k=1;k<g.n;k++) s += `<line x1="${x+k*cw}" y1="${y}" x2="${x+k*cw}" y2="${y+H}" stroke="${c.stroke}" stroke-opacity="0.35" stroke-width="1"/>`;
        if(r.text) s += `<text x="${x+rw/2}" y="${y+H/2+3.5}" text-anchor="middle" font-size="9.5" fill="${c.text}" fill-opacity="0.8" font-family="${MONO}">${esc(r.text)}</text>`;
      }
      const full = Math.min(Math.max(1, Math.floor((r.bits || GBITS)/(r.sew || sew))), CAP);
      if(full > g.n && !r.maskrow && !r.single) s += `<text x="${x+rw-4}" y="${y+H-4}" font-size="9" fill="${c.text}" fill-opacity="0.5" font-family="${SANS}" text-anchor="end">… ×${full}</text>`;
      if(i < ops.length){
        const oy = y + H + 14;
        const narrower = Math.min(rw, geo[i+1] ? geo[i+1].rw : rw);
        s += `<text x="${x+narrower/2}" y="${oy}" text-anchor="middle" font-size="17" fill="#57606a" font-family="${SANS}">${esc(ops[i])}</text>`;
      }
      y += H + gapA;
    });
    if(spec.applyMask) s += `<text x="${x+2}" y="${legendY}" font-size="9.5" fill="#57606a" font-family="${SANS}">grey = skipped (mask bit 0, vm = 0); light blue = written; vm = 1 → no mask</text>`;
    s += `</svg>`;
    container.innerHTML = s;
  }

  const grp = (n,e) => `${n}×${e}b`;
  const ctxS = (name) => [name, `VLEN=${VLEN}, LMUL=${LMUL} → register group = 2 regs = ${GBITS} bits; vm = 0 (masked)`];
  const descOf = inst => String(inst.desc || "").replace(/\.$/,"");
  const cfg = masked => `VLEN=${VLEN}, LMUL=${LMUL} → register group = 2 regs = ${GBITS} bits; ${masked ? "vm = 0 (masked)" : "vm = 1 (no mask)"}`;
  const ctxOf = (inst, masked) => {
    let d = descOf(inst);
    let line1 = `${inst.name} — ${d}`;
    if(line1.length > 76){
      const cut = d.indexOf(" (");
      const cut2 = d.indexOf(",");
      const c = cut > 0 ? (cut2 > 0 ? Math.min(cut, cut2) : cut) : cut2;
      if(c > 0) d = d.slice(0, c);
      line1 = `${inst.name} — ${d}`;
    }
    return [line1, cfg(masked)];
  };
  const MASKBIT = {label:"v0 (mask)", sub:"vm = 0: 1 bit per element", cls:"mask", maskrow:true};
  const OP2ROW = {
    vv:()=>({label:"vs1", sub:grp(8,32)}),
    vx:()=>({label:"rs1", sub:"XLEN bits (64b)", single:true, sew:64}),
    vi:()=>({label:"imm", sub:"5-bit imm", single:true, text:"imm", sew:32}),
    vf:()=>({label:"f[rs1]", sub:"32b FP (SEW)", single:true, sew:32}),
  };
  // op symbols by mnemonic base
  const OPS = {
    vadd:"+", vsub:"−", vrsub:"−", vminu:"min", vmin:"min", vmaxu:"max", vmax:"max",
    vaaddu:"avg", vaadd:"avg", vasubu:"avg", vasub:"avg",
    vand:"&", vor:"|", vxor:"^", vandn:"&~",
    vsaddu:"sat+", vsadd:"sat+", vssubu:"sat−", vssub:"sat−",
    vmul:"×", vmulhu:"mulh", vmulh:"mulh", vmulhsu:"mulh", vsmul:"mul",
    vsll:"≪", vsrl:"≫", vsra:"≫", vssrl:"≫", vssra:"≫",
    vnsrl:"≫", vnsra:"≫", vnclipu:"clip", vnclip:"clip",
    vwaddu:"+", vwadd:"+", vwsubu:"−", vwsub:"−",
    "vwaddu.w":"+", "vwadd.w":"+", "vwsubu.w":"−", "vwsub.w":"−",
    vwmulu:"×", vwmulsu:"×", vwmul:"×",
    vwmaccu:"", vwmacc:"", vwmaccus:"", vwmaccsu:"",
    vrgather:"idx", vrgatherei16:"idx",
    vadc:"+c", vmadc:"carry", vsbc:"−b", vmsbc:"borrow",
    vmerge:"?:",
    vmseq:"==", vmsne:"!=", vmsltu:"<", vmslt:"<", vmsleu:"≤", vmsle:"≤", vmsgtu:">", vmsgt:">",
    vfadd:"+", vfsub:"−", vfmin:"min", vfmax:"max", vfsgnj:"sgn", vfsgnjn:"sgn", vfsgnjx:"sgn",
    vfdiv:"÷", vfrdiv:"÷", vfmul:"×", vfrsub:"−",
    vfwmul:"×",
    vfwadd:"+", vfwsub:"−", "vfwadd.w":"+", "vfwsub.w":"−",
    vmfeq:"==", vmfne:"!=", vmflt:"<", vmfle:"≤", vmfgt:">", vmfge:"≥",
    vredsum:"Σ", vredand:"∧", vredor:"∨", vredxor:"⊕",
    vredminu:"min", vredmin:"min", vredmaxu:"max", vredmax:"max",
    vwredsumu:"Σ", vwredsum:"Σ",
    vfredusum:"Σ", vfredosum:"Σ", vfredmin:"min", vfredmax:"max",
    vfwredusum:"Σ", vfwredosum:"Σ",
    vmand:"∧", vmnand:"NAND", vmandn:"AND-N", vmxor:"⊕", vmor:"∨", vmnor:"NOR", vmorn:"OR-N", vmxnor:"XNOR",
    vmsbf:"first", vmsof:"only", vmsif:"through", viota:"iota", vid:"i",
    vcompress:"pack", vmv:"copy", vfmv:"copy",
    vcpop:"count", vfirst:"first",
    vclmul:"clm", vclmulh:"clmh", vbrev:"rev", vbrev8:"rev8", vclz:"clz", vctz:"ctz",
    vfsqrt:"√", vfrsqrt7:"1/√", vfrec7:"1/x", vfclass:"class",
    vfcvt:"cvt", vzext:"zext", vsext:"sext",
  };
  const WIDEN = new Set(["vwaddu","vwadd","vwsubu","vwsub","vwaddu.w","vwadd.w","vwsubu.w","vwsub.w",
    "vwmulu","vwmulsu","vwmul","vfwmul","vfwadd","vfwsub","vfwadd.w","vfwsub.w"]);
  const WIDMAC = new Set(["vwmaccu","vwmacc","vwmaccus","vwmaccsu","vfwmacc","vfwnmacc","vfwmsac","vfwnmsac"]);
  const NARROW = new Set(["vnsrl","vnsra","vnclipu","vnclip"]);
  const REDS = new Set(["vredsum","vredand","vredor","vredxor","vredminu","vredmin","vredmaxu","vredmax",
    "vwredsumu","vwredsum","vfredusum","vfredosum","vfredmin","vfredmax","vfwredusum","vfwredosum"]);
  const CMP = new Set(["vmseq","vmsne","vmsltu","vmslt","vmsleu","vmsle","vmsgtu","vmsgt",
    "vmfeq","vmfne","vmflt","vmfle","vmfgt","vmfge"]);
  const MASK2 = new Set(["vmand","vmnand","vmandn","vmxor","vmor","vmnor","vmorn","vmxnor"]);
  const MASKU = new Set(["vmsbf","vmsof","vmsif","viota","vid"]);
  const CARRY = new Set(["vadc","vmadc","vsbc","vmsbc"]);
  const MERGE = new Set(["vmerge","vfmerge"]);
  const FORMS = ["vvm","vxm","vim","vfm","vm","wv","wx","wi","vv","vx","vi","vf","vs","mm","f","m","v","s","x","i"];

  R.diagram = {
    render(container, inst){
      const key = inst.diagram;
      if(key === "fmadd"){ vflow(container, {
        ctx: "FMADD.S — fused scalar FP multiply-add: f[rd] = f[rs1] × f[rs2] + f[rs3]",
        regs:[{label:"f[rs1]", sub:"32b", single:true, sew:32}, {label:"f[rs2]", sub:"32b", single:true, sew:32},
              {label:"f[rs3]", sub:"32b", single:true, sew:32}, {label:"f[rd]", sub:"32b result", cls:"dst", single:true, sew:32}],
        ops:["×","+","="], sew:32,
      }); return; }
      const fn = this[key];
      if(fn) return fn.call(this, container, inst);
      if(key === "auto") return this.auto(container, inst);
      container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px">Behavior diagram not generated yet.</div>`;
    },

    /* ---------- reviewed reference diagrams (kept exactly as approved) ---------- */
    vadd(container){ vflow(container, {
      ctx: ctxS("vadd.vv — element-wise add of 8 × 32b"),
      regs:[{label:"vs2", sub:grp(8,32)}, {label:"vs1", sub:grp(8,32)},
            MASKBIT, {label:"vd", sub:grp(8,32), cls:"dst"}],
      ops:["+","","="], sew:32, applyMask:true,
    }); },
    vwadd(container){ vflow(container, {
      ctx: ctxS("vwadd.vv — widening add: 32b + 32b → 64b").concat(["widen: 32b inputs promoted to 64b each; vd = 2×LMUL = 4 regs (512b)"]),
      regs:[{label:"vs2", sub:grp(8,32)}, {label:"vs1", sub:grp(8,32)},
            MASKBIT, {label:"vd", sub:"8×64b (4 regs)", cls:"dst", sew:64, bits:512}],
      ops:["+","","="], sew:32, applyMask:true,
    }); },
    vnsrl(container){ vflow(container, {
      ctx: ctxS("vnsrl.wi — narrowing shift: 64b → 32b").concat(["narrow: 64b inputs truncated to 32b; vs2 = 2×LMUL = 4 regs (512b)"]),
      regs:[{label:"vs2", sub:"8×64b (4 regs)", sew:64, bits:512}, MASKBIT,
            {label:"vd", sub:grp(8,32), cls:"dst"}],
      ops:["≫","="], sew:32, applyMask:true,
    }); },
    vfmacc(container){ vflow(container, {
      ctx: ctxS("vfmacc.vv — FP multiply-accumulate: vs1 × vs2 + vd"),
      regs:[{label:"vs1", sub:grp(8,32)}, {label:"vs2", sub:grp(8,32)},
            {label:"vd", sub:"acc"}, MASKBIT,
            {label:"vd = vs1×vs2 + vd", sub:grp(8,32), cls:"dst"}],
      ops:["×","+","","="], sew:32, applyMask:true,
    }); },
    vredsum(container){ vflow(container, {
      ctx: ctxS("vredsum.vs — reduce all elements into one scalar"),
      regs:[{label:"vs2[0..vl-1]", sub:grp(8,32)}, MASKBIT,
            {label:"vs1[0]", sub:"32b acc"}, {label:"vd[0]", sub:"32b result", cls:"dst"}],
      ops:["Σ","","="], sew:32, applyMask:true,
    }); },
    vl(container, e, kind){
      const mem = kind==="unit" ? "mem[base+i]" : kind==="strided" ? "mem[base+i×stride]" : "mem[base+vs2[i]]";
      const N = rowCells(e);
      const op = kind==="unit" ? `vle${e}.v — unit-stride load: ${N} × ${e}b elements`
               : kind==="strided" ? `vlse${e}.v — strided load (stride = rs2): ${N} × ${e}b elements`
               : `vluxei${e}.v — indexed load (index = vs2): ${N} × ${e}b elements`;
      vflow(container, {
        ctx: ctxS(op),
        regs:[{label:mem, sub:`${N}×${e}b elements`, cls:"mem"}, MASKBIT,
              {label:"vd", sub:grp(N,e), cls:"dst"}],
        ops:["→",""], sew:+(e), applyMask:true,
      });
    },
    vle8(container){ this.vl(container,"8","unit"); },
    vlse32(container){ this.vl(container,"32","strided"); },
    vluxei16(container){ this.vl(container,"16","indexed"); },
    vse16(container){ vflow(container, {
      ctx: ctxS("vse16.v — unit-stride store: 16 × 16b elements"),
      regs:[{label:"vs3", sub:grp(16,16)}, MASKBIT,
            {label:"mem[base+i]", sub:"×16 elements", cls:"mem"}],
      ops:["","→"], sew:16, applyMask:true,
    }); },

    /* ---------- generic engine: one diagram for every vector instruction ---------- */
    auto(container, inst){
      const name = inst.name;
      let form = null, base = name;
      for(const f of FORMS){ if(name.endsWith("."+f)){ form = f; base = name.slice(0, -(f.length+1)); break; } }
      // 1) loads / stores
      if(/^v(le|se|lse|sse|luxei|loxei|suxei|soxei)\d/.test(base)) return this.vldst(container, inst, base);
      if(["vlm","vsm"].includes(base)) return this.vldst(container, inst, base);
      if(/^vl\d+re\d+$/.test(base) || /^vs\d+r$/.test(base)) return this.vldst(container, inst, base);
      // 2) reductions
      if(REDS.has(base)) return this.vred(container, inst, base);
      // 3) compare → mask
      if(CMP.has(base)) return this.vcmp(container, inst, base, form);
      // 4) mask binary ops
      if(MASK2.has(base)) return this.vmask(container, inst, base);
      // 5) mask unary / iota / vid
      if(MASKU.has(base)) return this.vmaskun(container, inst, base);
      // 6) mask counting
      if((base === "vcpop" || base === "vfirst") && form === "m") return this.vcount(container, inst, base);
      // 7) carry / borrow ops
      if(CARRY.has(base)) return this.vcarry(container, inst, base, form);
      // 8) merge
      if(MERGE.has(base)) return this.vmerge(container, inst, base, form);
      // 9) compress
      if(base === "vcompress") return this.vcompress(container, inst);
      // 10) moves
      if(base === "vmv.v") return this.vmv(container, inst, form);
      if(base === "vmv.x" || base === "vmv.s") return this.vmv(container, inst, form);
      if(base === "vfmv.f" || base === "vfmv.s") return this.vmv(container, inst, form);
      if(/^vmv\d+r$/.test(base)) return this.vwhole(container, inst, base, "copy", "vmv");
      // 11) configuration
      if(["vsetvli","vsetivli","vsetvl"].includes(base)) return this.vcfg(container, inst, base);
      // 12) unary FP
      if(["vfsqrt","vfrsqrt7","vfrec7","vfclass"].includes(base)) return this.vcvt(container, inst, base, "u32→u32");
      // 13) conversions, extensions
      if(/^v(f)?(f?ncvt|fwcvt|cvt)/.test(base) || /^vfcvt|^vfwcvt|^vfncvt/.test(base)) return this.vcvt(container, inst, base, "cvt");
      if(/^vzext|^vsext/.test(base)) return this.vcvt(container, inst, base, "ext");
      // 14) crypto / bitmanip unary + binary
      if(["vbrev","vbrev8","vclz","vctz"].includes(base) || (base === "vcpop" && form === "v")) return this.vcvt(container, inst, base, "u32→u32");
      if(["vandn","vclmul","vclmulh"].includes(base)) return this.vbin(container, inst, base, form);
      // 15) integer / FP binary (+ widening / narrowing)
      return this.vbin(container, inst, base, form);
    },

    /* binary arithmetic vv/vx/vi/vf (+ widening / narrowing / accumulate) */
    vbin(container, inst, base, form){
      const op = OPS[base] || "op";
      const FUSED = {
        vfmadd:["×","+"], vfmsub:["×","−"], vfnmadd:["−×","+"], vfnmsub:["−×","−"],
        vfmacc:["×","+"], vfmsac:["×","−"], vfnmacc:["−×","+"], vfnmsac:["−×","−"],
        vfwmacc:["×","+"], vfwmsac:["×","−"], vfwnmacc:["−×","+"], vfwnmsac:["−×","−"],
        vwmaccu:["×","+"], vwmacc:["×","+"], vwmaccus:["×","+"], vwmaccsu:["×","+"],
      };
      const f2 = (form === "vv" || form === "wv") ? "vv" : (form === "vi" || form === "wi") ? "vi" : (form === "vf") ? "vf" : "vx";
      const src = OP2ROW[f2]();
      const acc = WIDMAC.has(base) || /^v(f)?(madd|nmadd|msub|nmsub|macc|nmacc|msac|nmsac)/.test(base) ||
                  /^v(?:wmacc|fwmacc)/.test(base);
      const widen = WIDEN.has(base) && !acc;
      const narrow = NARROW.has(base);
      const sewS = narrow ? 64 : 32, sewD = (widen || acc) ? 64 : (narrow ? 32 : 32);
      const srcRow = {label:"vs2", sub: narrow ? "8×64b" : grp(8,32), sew:narrow ? 64 : 32, bits:narrow ? 512 : undefined};
      const dstRow = {label: acc ? "vd (result)" : "vd", sub: (widen || acc) ? "8×64b" : grp(8,32), cls:"dst", sew: sewD, bits:(widen || acc) ? 512 : undefined};
      const regs = acc
        ? [srcRow,
           src,
           {label:"vd (acc)", sub:(widen||acc)?"8×64b":"acc", sew:sewD, bits:(widen||acc)?512:undefined},
           MASKBIT, dstRow]
        : [srcRow, src, MASKBIT, dstRow];
      const ops = acc ? [...(FUSED[base] || [op, "+"]), "", "="] : [op, "", "="];
      vflow(container, { ctx: ctxOf(inst, true), regs, ops, sew:32, applyMask:true });
    },

    /* reduction .vs → scalar */
    vred(container, inst, base){
      const widen = base.startsWith("vwred") || base.startsWith("vfwred");
      vflow(container, {
        ctx: ctxOf(inst, true),
        regs:[{label:"vs2[0..vl-1]", sub:grp(8,32)}, MASKBIT,
              {label:"vs1[0]", sub:"32b acc", single:true},
              {label:"vd[0]", sub: widen ? "64b result" : "32b result", cls:"dst", single:true, sew: widen ? 64 : 32}],
        ops:[OPS[base]||"Σ","","="], sew:32, applyMask:true,
      });
    },

    /* compare → mask result */
    vcmp(container, inst, base, form){
      const src = OP2ROW[form === "vf" ? "vf" : form === "vx" ? "vx" : form === "vi" ? "vi" : "vv"]();
      vflow(container, {
        ctx: ctxOf(inst, true),
        regs:[{label:"vs2", sub:grp(8,32)}, src, MASKBIT,
              {label:"vd", sub:"mask: 1 bit per element", cls:"dst", maskrow:true}],
        ops:[OPS[base]||"cmp","","="], sew:32, applyMask:true,
      });
    },

    /* mask binary ops (all rows are 1-bit) */
    vmask(container, inst, base){
      vflow(container, {
        ctx: ctxOf(inst, false),
        regs:[{label:"vs2", sub:"mask bits", maskrow:true},
              {label:"vs1", sub:"mask bits", maskrow:true},
              {label:"vd", sub:"mask result", cls:"dst", maskrow:true}],
        ops:[OPS[base]||"op","="], sew:32, applyMask:false,
      });
    },

    /* mask unary: vmsbf/vmsof/vmsif/viota/vid */
    vmaskun(container, inst, base){
      const toEl = base === "viota" || base === "vid";
      vflow(container, {
        ctx: ctxOf(inst, true),
        regs:[{label:"vs2", sub:"mask bits", maskrow:true},
              toEl ? {label:"vd", sub:grp(8,32), cls:"dst"} : {label:"vd", sub:"mask result", cls:"dst", maskrow:true}],
        ops:[OPS[base]||"op"], sew:32, applyMask:true,
      });
    },

    /* vcpop.m / vfirst.m → scalar rd */
    vcount(container, inst, base){
      vflow(container, {
        ctx: ctxOf(inst, true),
        regs:[{label:"vs2", sub:"mask bits", maskrow:true},
              {label:"rd", sub:"XLEN bits", cls:"dst", single:true, sew:64}],
        ops:[base === "vcpop" ? "count bits" : "first index"], sew:32, applyMask:true,
      });
    },

    /* vadc/vmadc/vsbc/vmsbc: v0 is carry/borrow, not mask */
    vcarry(container, inst, base, form){
      const src = OP2ROW[form === "vim" ? "vi" : (form === "vxm" ? "vx" : "vv")]();
      const outMask = base === "vmadc" || base === "vmsbc";
      const c0 = {label:"v0", sub: base.startsWith("vs") ? "borrow in: 1 bit per element" : "carry in: 1 bit per element", cls:"mask", maskrow:true};
      vflow(container, {
        ctx: ctxOf(inst, false),
        regs:[{label:"vs2", sub:grp(8,32)}, src, c0,
              outMask ? {label:"vd", sub:"mask result", cls:"dst", maskrow:true} : {label:"vd", sub:grp(8,32), cls:"dst"}],
        ops:[OPS[base]||"op","","="], sew:32, applyMask:false,
      });
    },

    /* vmerge.vvm/vxm/vim, vfmerge.vfm: v0 selects */
    vmerge(container, inst, base, form){
      const src = OP2ROW[form === "vim" ? "vi" : (form === "vfm" ? "vf" : form === "vxm" ? "vx" : "vv")]();
      vflow(container, {
        ctx: ctxOf(inst, false),
        regs:[{label:"vs2", sub:grp(8,32)}, src,
              {label:"v0", sub:"select: 1 bit per element", cls:"mask", maskrow:true},
              {label:"vd", sub:grp(8,32), cls:"dst"}],
        ops:["?:","","="], sew:32, applyMask:false,
      });
    },

    /* vcompress.vm */
    vcompress(container, inst){
      vflow(container, {
        ctx: ctxOf(inst, false),
        regs:[{label:"vs2", sub:grp(8,32)},
              {label:"vs1", sub:"active mask: 1 bit per element", cls:"mask", maskrow:true},
              {label:"vd", sub:grp(8,32), cls:"dst"}],
        ops:["pack","="], sew:32, applyMask:false,
      });
    },

    /* moves: vmv.v.v/x/i, vmv.x.s, vmv.s.x, vfmv.f.s, vfmv.s.f */
    vmv(container, inst, form){
      const base = inst.name.replace(/\.[^.]+$/,"");
      const src = base === "vmv.v" ? (form === "x" ? OP2ROW.vx() : form === "i" ? OP2ROW.vi() : {label:"vs1", sub:grp(8,32)})
                : base === "vmv.x" ? {label:"vs2", sub:grp(8,32)}
                : base === "vmv.s" ? {label:"rs1", sub:"XLEN bits", single:true, sew:64}
                : base === "vfmv.f" ? {label:"vs2", sub:grp(8,32)}
                : {label:"f[rs1]", sub:"32b FP (SEW)", single:true, sew:32};
      const dst = base === "vmv.x" || base === "vfmv.f"
        ? {label: base === "vfmv.f" ? "f[rd]" : "rd", sub:"XLEN bits", cls:"dst", single:true, sew:64}
        : base === "vmv.s" || base === "vfmv.s"
        ? {label:"vd", sub:"element 0", cls:"dst", single:true}
        : {label:"vd", sub:grp(8,32), cls:"dst"};
      vflow(container, { ctx: ctxOf(inst, false), regs:[src, dst], ops:["→"], sew:32, applyMask:false });
    },

    /* whole-register copy */
    vwhole(container, inst, base){
      const n = (base.match(/^vmv(\d)r/)||[])[1] || "1";
      vflow(container, {
        ctx: ctxOf(inst, false),
        regs:[{label:"vs2", sub:`${n} × 128b registers`},
              {label:"vd", sub:"result", cls:"dst"}],
        ops:["copy"], sew:32, applyMask:false,
      });
    },

    /* vsetvli / vsetivli / vsetvl */
    vcfg(container, inst, base){
      const src = base === "vsetivli"
        ? {label:"uimm", sub:"AVL immediate", single:true, text:"uimm", sew:32}
        : {label:"rs1", sub:"AVL (XLEN bits)", single:true, sew:64};
      const typ = base === "vsetvl"
        ? [{label:"rs2", sub:"new vtype", single:true, text:"vtype", sew:64}]
        : [{label:"vtypei", sub:"11 bits", single:true, text:"vtype", sew:32}];
      vflow(container, {
        ctx: ctxOf(inst, false),
        regs:[src, ...typ, {label:"rd", sub:"vl + vtype (XLEN bits)", cls:"dst", single:true, sew:64}],
        ops:["","set"], sew:32, applyMask:false, nolabels:true,
      });
    },

    /* unary / conversion / extension */
    vcvt(container, inst, base, kind){
      const narrow = /^vfncvt/.test(base);
      const widen = /^vfwcvt|^vfw/.test(base) && !narrow;
      const extF = (base.match(/vf([248])$/)||[])[1];
      const srcSew = extF ? 32/(+extF) : (narrow ? 64 : 32);
      const srcBits = extF ? 128/(+extF) : (narrow ? 512 : undefined);
      const uf = base === "vfsqrt" ? "√" : base === "vfrsqrt7" ? "1/√" : base === "vfrec7" ? "1/x"
               : base === "vfclass" ? "class" : kind === "ext" ? (base.startsWith("vzext")?"zext":"sext") : "cvt";
      vflow(container, {
        ctx: ctxOf(inst, true),
        regs:[{label:"vs2", sub: narrow ? "8×64b" : (extF ? `${rowCells(srcBits/srcSew)}×${srcSew}b` : grp(8,32)), sew: srcSew, bits: srcBits},
              MASKBIT,
              {label:"vd", sub: widen ? "8×64b" : grp(8,32), cls:"dst", sew: widen ? 64 : 32, bits: widen ? 512 : undefined}],
        ops:["","→"], sew:32, applyMask:true,
      });
    },

    /* load / store family */
    vldst(container, inst, base){
      const m = base.match(/^v(le|se|lse|sse|luxei|loxei|suxei|soxei)(\d+)/);
      const store = /^vs[se]/.test(base) || /^vsuxei|^vsoxei/.test(base);
      const kind = /^vluxei|^vsoxei|^vloxei|^vsuxei/.test(base) ? "indexed"
                 : /^vlse|^vsse/.test(base) ? "strided" : "unit";
      if(m){
        const e = +m[2];
        const N = rowCells(e);
        const mem = kind === "unit" ? "mem[base+i]"
                  : kind === "strided" ? "mem[base+i×stride]" : "mem[base+vs2[i]]";
        if(store){
          vflow(container, {
            ctx: ctxOf(inst, true),
            regs:[{label:"vs3", sub:grp(N,e)}, MASKBIT, {label:mem, sub:`×${N} elements`, cls:"mem"}],
            ops:["","→"], sew:e, applyMask:true,
          });
        } else {
          vflow(container, {
            ctx: ctxOf(inst, true),
            regs:[{label:mem, sub:`${N}×${e}b elements`, cls:"mem"}, MASKBIT, {label:"vd", sub:grp(N,e), cls:"dst"}],
            ops:["→",""], sew:e, applyMask:true,
          });
        }
        return;
      }
      if(base === "vlm" || base === "vsm"){
        vflow(container, {
          ctx: ctxOf(inst, false),
          regs: base === "vlm"
            ? [{label:"mem[base+byte]", sub:"packed mask bits", cls:"mem"}, {label:"vd", sub:"mask bits", cls:"dst", maskrow:true}]
            : [{label:"vs3", sub:"mask bits", maskrow:true}, {label:"mem[base+byte]", sub:"packed mask bits", cls:"mem"}],
          ops: base === "vlm" ? ["→"] : ["→"], sew:32, applyMask:false,
        });
        return;
      }
      // whole-register load/store
      const n = (base.match(/^v[ls](\d)/)||[])[1] || "1";
      const st = /^vs\d+r$/.test(base);
      vflow(container, {
        ctx: ctxOf(inst, false),
        regs: st
          ? [{label:"vs3", sub:`${n} × 128b registers`}, {label:"mem[base+i×128b]", sub:`${n} registers`, cls:"mem"}]
          : [{label:"mem[base+i×128b]", sub:`${n} registers`, cls:"mem"}, {label:"vd", sub:`${n} × 128b registers`, cls:"dst"}],
        ops:["→"], sew:32, applyMask:false,
      });
    },
  };
})();
