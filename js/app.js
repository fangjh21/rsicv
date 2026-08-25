/* RISC-V ISA reference — application logic */
(function(){
  const R = window.RISCV;
  const app = document.getElementById('app');
  const navLinks = document.querySelectorAll('.nav a');
  const topSearch = document.getElementById('topSearch');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------- bit-field layouts ---------- */
  const LAYOUTS = {
    R:   [["funct7",31,25],["rs2",24,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    I:   [["imm[11:0]",31,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    Is:  [["funct7",31,25],["shamt",24,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    S:   [["imm[11:5]",31,25],["rs2",24,20],["rs1",19,15],["funct3",14,12],["imm[4:0]",11,7],["opcode",6,0]],
    B:   [["imm[12]",31,31],["imm[10:5]",30,25],["rs2",24,20],["rs1",19,15],["funct3",14,12],["imm[4:1]",11,8],["imm[11]",7,7],["opcode",6,0]],
    U:   [["imm[31:12]",31,12],["rd",11,7],["opcode",6,0]],
    J:   [["imm[20]",31,31],["imm[10:1]",30,21],["imm[11]",20,20],["imm[19:12]",19,12],["rd",11,7],["opcode",6,0]],
    R4:  [["rs3",31,27],["fmt",26,25],["rs2",24,20],["rs1",19,15],["rm",14,12],["rd",11,7],["opcode",6,0]],
    FPR: [["funct7",31,25],["rs2",24,20],["rs1",19,15],["rm",14,12],["rd",11,7],["opcode",6,0]],
    FPC: [["funct7",31,25],["rs2",24,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    AMO: [["funct5",31,27],["aq",26,26],["rl",25,25],["rs2",24,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    CSR: [["csr[11:0]",31,20],["rs1/uimm",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    SYS: [["funct7",31,25],["rs2",24,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    FENCE:[["fm",31,28],["pred",27,24],["succ",23,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    V:    [["funct6",31,26],["vm",25,25],["vs2",24,20],["vs1",19,15],["funct3",14,12],["vd",11,7],["opcode",6,0]],
    VCFG: [["funct2",31,30],["zimm[10:0]",30,20],["rs1",19,15],["funct3",14,12],["rd",11,7],["opcode",6,0]],
    VLD:  [["nf",31,29],["mew",28,28],["mop",27,26],["vm",25,25],["lumop/sumop",24,20],["rs1",19,15],["width",14,12],["vd/vs3",11,7],["opcode",6,0]],
  };
  function vsrcLabel(inst){
    const f3 = inst.values && inst.values.funct3;
    if(f3==="011") return "imm[4:0]";
    if(f3==="100"||f3==="101"||f3==="110") return "rs1";
    return "vs1";
  }

  const list = R.INSTRUCTIONS.slice().sort((a,b)=> a.name.localeCompare(b.name));
  const EXT_GROUPS = {"RV32I":"I","RV64I":"I","M":"M","A":"A","RV32F":"F","RV64F":"F","RV32D":"D","RV64D":"D","C":"C","V":"V","Zicsr":"Zicsr","Zifencei":"Zifencei","Priv":"Priv"};
  const EXT_CHIPS = ["All","I","M","A","F","D","C","V","Zicsr","Zifencei","Priv"];

  /* ---------- Excel-style encoding grid ---------- */
  function buildBits(inst){
    const layout = LAYOUTS[inst.type]; if(!layout) return null;
    const v = inst.values||{}; let out = "";
    for(const [label,hi,lo] of layout) out += /^[01]+$/.test(v[label]||"") ? (v[label]).padStart(hi-lo+1,'0') : "0".repeat(hi-lo+1);
    return out;
  }
  function exampleHex(inst){
    if(inst.bit16) return null;
    const bits = buildBits(inst); if(!bits) return null;
    return "0x" + parseInt(bits,2).toString(16).toUpperCase().padStart(8,'0');
  }
  const sob = label => label.replace(/\[.*\]$/,'').replace('/uimm','');
  function regdiagram(inst){
    if(inst.bit16) return `<div class="mono" style="background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:8px 12px">${esc(inst.cenc)}</div>`;
    let layout = LAYOUTS[inst.type] || LAYOUTS.I;
    const v = inst.values||{};
    layout = layout.map(f => inst.type==="V" && f[0]==="vs1" ? [vsrcLabel(inst), f[1], f[2]] : f);
    const named = label => /^(opcode|funct7|funct3|funct5|funct6|fmt)$/.test(label);
    let head='<tr>'; for(let b=31;b>=0;b--) head+=`<td>${b}</td>`; head+='</tr>';
    let f1='<tr class="firstrow">', f2='<tr class="secondrow">';
    for(const [label,hi,lo] of layout){
      const w=hi-lo+1;
      const bits=/^[01]+$/.test(v[label]||"") ? (v[label]).padStart(w,'0') : null;
      if(bits){
        for(let i=0;i<w;i++){ const c=(i===0&&i===w-1)?'lr':(i===0?'l':(i===w-1?'r':'')); f1+=`<td class="${c}">${bits[i]}</td>`; }
        f2+=`<td colspan="${w}" class="${named(label)?'droppedname':''}"${named(label)?` title="${esc(label)}"`:''}>${named(label)?esc(label):''}</td>`;
      } else {
        const nm=sob(label);
        f1+=`<td colspan="${w}" class="lr">${esc(nm)}</td>`;
        f2+=`<td colspan="${w}"></td>`;
      }
    }
    f1+='</tr>'; f2+='</tr>';
    return `<div class="regdiagram-32"><table class="regdiagram"><thead>${head}</thead><tbody>${f1}${f2}</tbody></table></div>`;
  }
  // regdiagram that shows only a subset of fields fixed; the rest show 'x' (don't-care)
  function c16segments(cenc){
    const tokens = String(cenc).trim().split(/\s+/).filter(t => t !== '|');
    const segs = [];
    for(const tok of tokens){
      if(/^[01]+$/.test(tok)){ segs.push({fixed:tok, raw:tok, disp:null, w:tok.length}); continue; }
      let base = tok, w = 0;
      const m = tok.match(/^([A-Za-z][A-Za-z0-9'_]*)(?:\[([^\]]+)\])?$/);
      if(m){
        base = m[1];
        if(m[2]){
          for(const r of m[2].split('|')){ const p = r.split(':'); w += (p.length===1) ? 1 : (parseInt(p[0],10)-parseInt(p[1],10)+1); }
        } else {
          w = {rd:5,rs1:5,rs2:5,"rd'":3,"rs1'":3,"rs2'":3,shamt:5}[base] || 0;
        }
      }
      segs.push({fixed:null, raw:tok, disp:base, w});
    }
    return segs;
  }
  function c16regdiagram(cenc){
    const segs = c16segments(cenc);
    let head='<tr>'; for(let b=15;b>=0;b--) head+=`<td>${b}</td>`; head+='</tr>';
    let f1='<tr class="firstrow">';
    for(const s of segs){
      if(s.fixed!=null){
        for(let i=0;i<s.w;i++){ const c=(s.w===1)?'lr':(i===0?'l':(i===s.w-1?'r':'')); f1+=`<td class="${c}">${s.fixed[i]}</td>`; }
      } else {
        f1+=`<td colspan="${s.w}" class="lr" title="${esc(s.disp)}">${esc(s.disp)}</td>`;
      }
    }
    f1+='</tr>';
    let f2='<tr class="secondrow">';
    segs.forEach((s, idx) => {
      if(idx===0 && s.fixed!=null && s.w===3){ f2+=`<td colspan="3" class="droppedname">funct3</td>`; }
      else if(idx===segs.length-1 && s.fixed!=null && s.w===2){ f2+=`<td colspan="2" class="droppedname">op</td>`; }
      else { f2+=`<td colspan="${s.w}"></td>`; }
    });
    f2+='</tr>';
    let f3='<tr class="cencrow">';
    for(const s of segs){ f3+=`<td colspan="${s.w}">${esc(s.raw)}</td>`; }
    f3+='</tr>';
    return `<div class="regdiagram-16"><table class="regdiagram"><thead>${head}</thead><tbody>${f1}${f2}${f3}</tbody></table></div>`;
  }
  function renderEncoding(inst){
    if(inst.bit16){
      return `${c16regdiagram(inst.cenc)}
      <div class="bit-legend">16-bit compressed instruction: bits [15:13] = funct3, [1:0] = quadrant. Operand fields are named by field; the exact immediate-bit mapping (e.g. imm[5]) appears in the text above — immediates are scrambled across the 16-bit word, so the header number is the bit position, not the immediate index.</div>`;
    }
    let layout = LAYOUTS[inst.type] || LAYOUTS.I;
    const v = inst.values||{};
    layout = layout.map(f => inst.type==="V" && f[0]==="vs1" ? [vsrcLabel(inst), f[1], f[2]] : f);
    let tbl = `<table class="fieldtable"><thead><tr><th>Field</th><th>Bits</th><th>Value / meaning</th></tr></thead><tbody>`;
    for(const [label,hi,lo] of layout){
      const w = hi-lo+1, bits = /^[01]+$/.test(v[label]||"") ? (v[label]).padStart(w,'0') : null;
      tbl += `<tr><td>${esc(label)}</td><td class="bits">[${hi}:${lo}]</td><td>${bits?`<span class="mono">${esc(bits)}</span> · ${esc(fieldMeaning(label))}`:esc(fieldMeaning(label))}</td></tr>`;
    }
    tbl += `</tbody></table>`;
    return `${regdiagram(inst)}<div class="bit-legend">Encoding diagram: row 1 gives the bit values with field-boundary borders, row 2 drops the field names; operand fields show their names.</div>${tbl}`;
  }
  function fieldMeaning(label){
    const m = {
      "opcode":"Major opcode","funct3":"3-bit sub-opcode selector","funct7":"7-bit sub-opcode selector",
      "funct6":"6-bit vector opcode selector","funct5":"5-bit AMO operation","funct2":"2-bit selector",
      "fmt":"FP format: 00=S 01=D 10=H 11=Q","rd":"Destination register","rs1":"Source register 1",
      "rs2":"Source register 2","rs3":"Source register 3 (fused addend)","vd":"Vector destination group",
      "vs2":"Vector source group 2","vs1":"Vector source group 1","vm":"Vector mask (v0.t / unmasked)",
      "rm":"Rounding mode: 000=RNE 001=RTZ 010=RDN 011=RUP 100=RMM 111=DYN","aq":"Acquire bit","rl":"Release bit",
      "shamt":"Shift amount","fm":"Device-I/O / memory-order domain","pred":"Predecessor set","succ":"Successor set",
      "nf":"Number of fields (segments)","mew":"Expanded memory width","mop":"Addressing mode","lumop/sumop":"Unit-stride op",
      "width":"Element width (EEW)","csr[11:0]":"CSR address (12-bit)","zimm[10:0]":"vtype immediate","funct2":"vsetvl op"
    };
    if(m[label]) return m[label];
    if(label.indexOf("imm")>=0) return "Immediate (sign/zero-extended per instruction)";
    if(label.indexOf("rs1")>=0) return "Source register / 5-bit immediate (CSR form)";
    return "Operand";
  }

  /* ---------- Spike rendering with recursive helper navigation ---------- */
  const SAIL = R.SPIKE || {};
  function sailify(text, skipFn){
    return String(text).split('\n').map(line => {
      const t = line.trim();
      if(t.startsWith('//') || t.startsWith('#')) return `<span class="c">${esc(line)}</span>`;
      let s = esc(line);
      // link function/method calls: ident, a.b.ident, or a::b::ident followed by ( or < ; never link the function's own name
      s = s.replace(/([A-Za-z_][A-Za-z0-9_.]*(?:::[A-Za-z_][A-Za-z0-9_]*)?)\s*(?=[<(])/g, (m, id) => (SAIL[id] && id!==skipFn) ? `<a class="sailfn" data-fn="${id}">${id}</a>` : m);
      // link bare macros / registers / globals
      const bare = ["require_fp","require_align","require_extension","require_privilege","require_vector_vs","set_fp_exceptions","VI_VV_LOOP","VI_VX_LOOP","VI_VI_LOOP","VI_VF_LOOP","VI_WIDE_VV_LOOP","VI_WIDE_VX_LOOP","VI_WIDE_VI_LOOP","VI_MM_LOOP","VI_MASK_LOOP","RS1","RS2","RS3","RD","FRS1","FRS2","FRS3","FRD","pc","npc","RM","fflags","frm","STATE","xlen","sext_xlen","zext_xlen","sext32","sreg_t","ureg_t","reg_t","float32_t","float64_t"];
      for(const b of bare){
        if(SAIL[b] && b!==skipFn) s = s.replace(new RegExp("\\b"+b+"\\b","g"), `<a class="sailfn" data-fn="${b}">${b}</a>`);
      }
      // link dotted globals accessed without ()/< (keys contain '.' so \b..\b misses them)
      for(const b of ["P.VU.vl","P.VU.vstart","P.VU.vill","P.VU.vxsat","P.VU.VLEN"]){
        if(SAIL[b] && b!==skipFn) s = s.replace(new RegExp(b.split('.').join('\\.'),"g"), `<a class="sailfn" data-fn="${b}">${b}</a>`);
      }
      return s;
    }).join('\n');
  }
  let sailStack = [];
  function openSail(fn){
    if(!SAIL[fn]) return;
    sailStack.push(fn);
    renderSailModal();
  }
  function renderSailModal(){
    const fn = sailStack[sailStack.length-1];
    const crumbs = sailStack.map((f,i)=>`<a class="sailfn" data-fn="${f}" data-idx="${i}">${esc(f)}</a>`).join(' › ');
    let ov = document.getElementById('sailModal');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'sailModal';
      ov.className = 'modal-overlay';
      ov.innerHTML = `<div class="modal">
        <div class="modal-head"><h3>Spike function / macro</h3><span class="crumb" id="sailCrumb"></span>
          <button class="modal-close" id="sailBack" title="back">← back</button>
          <button class="modal-close" id="sailClose" title="close">✕</button></div>
        <div class="modal-body"><pre class="code" id="sailBody"></pre></div></div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click', e => {
        e.stopPropagation();   // keep the modal's own clicks (incl. re-rendered child links) from re-firing on document
        if(e.target===ov) closeSail();
        else if(e.target.id==='sailClose') closeSail();
        else if(e.target.id==='sailBack'){ sailStack.pop(); if(!sailStack.length) closeSail(); else renderSailModal(); }
        else if(e.target.classList && e.target.classList.contains('sailfn')){
          const idx = e.target.dataset.idx;
          if(idx!==undefined){ sailStack = sailStack.slice(0, +idx+1); renderSailModal(); }
          else openSail(e.target.dataset.fn);
        }
      });
    }
    ov.style.display = 'flex';
    document.getElementById('sailCrumb').innerHTML = crumbs;
    document.getElementById('sailBody').innerHTML = `<span class="c">// Spike helper</span> ${esc(fn)}\n\n` + sailify(SAIL[fn], fn);
  }
  function closeSail(){ const ov=document.getElementById('sailModal'); if(ov) ov.style.display='none'; sailStack=[]; }

  // any .sailfn outside the modal opens its definition (recursive)
  document.addEventListener('click', e => {
    if(e.target && e.target.closest && e.target.closest('#sailModal')) return;
    const fn = e.target && e.target.closest ? e.target.closest('.sailfn') : null;
    if(fn){ e.preventDefault(); openSail(fn.dataset.fn); }
  });

  function badges(inst){
    let s = `<span class="badge ext">${esc(inst.ext)}</span> <span class="badge type">${esc(inst.bit16?'16-bit':inst.type)}</span>`;
    if(inst.example) s += ` <span class="badge example">★ example</span>`;
    return s;
  }

  /* ---------- overview ---------- */
  function renderOverview(){
    const ex = list.find(i=>i.example);
    app.innerHTML = `
    <div class="hero"><h1>RISC-V Instruction Set Reference</h1>
      <p>An ARM ISA-XML-style reference for every RISC-V instruction: 32-bit <b>encoding</b> (grid), <b>assembly</b>, <b>behavior diagram</b>, and a <b>golden model</b> following Spike (riscv-isa-sim) with clickable helpers — organized by a hierarchical bit-decode tree and protection domains.</p>
      <div class="cta">
        <a class="btn" href="#/list">Browse instructions →</a>
        <a class="btn ghost" href="#/enc">Encoding decode tree →</a>
        <a class="btn ghost" href="#/priv">Protection domains →</a>
        <a class="btn ghost" href="#/inst/FMADD.S">Example: FMADD.S →</a>
      </div>
    </div>
    <div class="grid cols-3">
      <div class="stat"><b>${list.length}</b><span>instructions (RV32/64 · M/A/F/D/C/V/Zicsr)</span></div>
      <div class="stat"><b>${new Set(list.map(i=>i.ext)).size}</b><span>extensions / categories</span></div>
      <div class="stat"><b>32</b><span>major-opcode slots in the decode tree</span></div>
      <div class="stat"><b>${ex?esc(ex.name):"—"}</b><span>example with diagram + golden model</span></div>
    </div>
    <div class="card"><h2><span class="idx">§</span>Reference specification</h2>
      <ul style="margin:0;padding-left:18px;font-size:14px;color:var(--ink)">
        <li><a href="https://github.com/riscv/riscv-isa-manual/releases" target="_blank" rel="noopener"><b>RISC-V Instruction Set Manual, Volume I: Unprivileged Architecture</b></a> — Version 20250508 (ratified). Instruction encodings &amp; semantics, including the RV32I/RV64I base, M, A, F, D, C, Zicsr, Zifencei and the Vector "V" extension (v1.0). <a href="https://riscv.org/technical/specifications/" target="_blank" rel="noopener">RISC-V specifications index</a>.</li>
        <li><a href="https://github.com/riscv/riscv-isa-manual/releases" target="_blank" rel="noopener"><b>RISC-V Instruction Set Manual, Volume II: Privileged Architecture</b></a> — CSR address space, PMP, paging and privilege levels (CSR numbering per the ratified privileged spec).</li>
        <li><b>Golden models</b> follow <a href="https://github.com/riscv-software-src/riscv-isa-sim" target="_blank" rel="noopener">Spike (riscv-isa-sim)</a> + Berkeley SoftFloat, in the style of <code>riscv/insns/*.h</code>.</li>
      </ul>
    </div>`;
  }

  /* ---------- summary: mnemonic + brief behavior ---------- */
  let filterExt = "All", query = "";
  function renderList(){
    const q = query.trim().toLowerCase();
    const rows = list.filter(i => (filterExt==="All" || EXT_GROUPS[i.ext]===filterExt) && (!q || i.name.toLowerCase().includes(q) || (i.desc||"").toLowerCase().includes(q)));
    const chips = EXT_CHIPS.map(c => `<span class="chip ${filterExt===c?'on':''}" data-ext="${c}">${c}</span>`).join('');
    const body = rows.map(i => `<tr data-name="${esc(i.name)}"><td class="mnem">${i.example?'★ ':''}${esc(i.name)}</td><td>${esc(i.desc||'')}</td></tr>`).join('');
    app.innerHTML = `
    <h1 class="page-title">Instruction Summary</h1>
    <p class="page-sub">Every instruction, alphabetically, with a one-line behavior note · click a row for encoding + golden model</p>
    <div class="card">
      <div class="toolbar">
        <input type="search" id="listSearch" placeholder="Search mnemonic or behavior…" value="${esc(query)}">
        <div class="chips">${chips}</div><span class="count">${rows.length} instructions</span>
      </div>
      <div style="overflow-x:auto"><table><thead><tr><th style="width:200px">Mnemonic</th><th>Behavior</th></tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
    document.getElementById('listSearch').addEventListener('input', e => { query=e.target.value; renderList(); });
    document.querySelectorAll('.chip[data-ext]').forEach(c => c.addEventListener('click', e => { filterExt=e.target.dataset.ext; renderList(); }));
    document.querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', () => location.hash='#/inst/'+encodeURIComponent(tr.dataset.name)));
  }

  /* ---------- detail ---------- */
  function regSummary(inst){
    const layout = (LAYOUTS[inst.type]||[]).map(f=>f[0]);
    const isFP = /F|D/.test(inst.ext) || ['FPR','FPC','R4'].includes(inst.type);
    const isVec = inst.ext==='V';
    const reads=[], writes=[];
    for(const f of layout){
      if(f==='rd') writes.push(isFP?'f[rd]':(isVec?'v[vd]':'rd'));
      else if(f==='rs3') reads.push(isFP?'f[rs3]':'rs3');
      else if(f==='rs2') reads.push(isFP?'f[rs2]':(isVec?'v[vs2]':'rs2'));
      else if(f==='rs1/uimm') reads.push('rs1 / uimm[4:0]');
      else if(f==='rs1') reads.push(isFP?'f[rs1]':(isVec?'v[vs1]':'rs1'));
      else if(f.startsWith('vs1')) reads.push('v[vs1]');
      else if(f.startsWith('vs2')) reads.push('v[vs2]');
      else if(f.startsWith('vd')) { if(inst.type==='VLD' && /store/.test(inst.asm)) reads.push('v[vd]'); else writes.push('v[vd]'); }
      else if(f.startsWith('csr')) { reads.push('csr'); writes.push('csr'); }
    }
    if(!reads.length && !writes.length) return null;
    return {reads:[...new Set(reads)], writes:[...new Set(writes)]};
  }
  function exceptionsOf(inst){
    const g = inst.group, t = inst.type;
    if(['LOAD','STORE'].includes(g) || t==='VLD' || g==='FP-LD-ST' || g==='V-LD-ST')
      return ['Address-misaligned exception', 'Access-fault exception', 'Page fault'];
    if(t==='AMO') return ['Address-misaligned exception', 'Access-fault exception'];
    if(['FPR','FPC','R4'].includes(t)) return ['Illegal instruction (if the F/D extension is absent, or mstatus.FS = Off)', 'FP exceptions: NV, DZ, OF, UF, NX (accrued into fcsr.fflags)'];
    if(['V-ARITH','V-FP','V-RED','V-MASK','V-PERM','V-CVT','V-CMP','V-CRYPTO'].includes(g)) return ['Illegal instruction (if the V extension is absent, or vtype.vill)', 'Address-misaligned / access-fault (for vector memory ops)'];
    if(g==='CSR') return ['Illegal instruction (read-only CSR, or insufficient privilege)'];
    if(g==='SYSTEM') return ['Illegal instruction (privilege check)', 'Environment call / breakpoint (ECALL / EBREAK)'];
    return ['None'];
  }

  function renderDetail(name){
    const inst = list.find(i => i.name === name);
    if(!inst){ renderOverview(); return; }
    const idx = list.indexOf(inst);
    const prev = idx>0?list[idx-1]:null, next = idx<list.length-1?list[idx+1]:null;
    const hex = exampleHex(inst);
    const regs = regSummary(inst);
    const ex = exceptionsOf(inst);
    const sail = inst.sail ? `<div class="card"><h2><span class="idx">O</span>Operation</h2><p style="color:var(--muted);font-size:12.5px;margin:0 0 8px">Golden model (Spike · riscv-isa-sim) — click any identifier to open its definition.</p><pre class="code">${sailify(inst.sail)}</pre></div>` : `<div class="card" style="border-style:dashed"><span class="badge warn">pending</span> Operation / golden model added in a later pass.</div>`;
    const diag = inst.diagram ? `<div class="card"><h2><span class="idx">D</span>Behavior diagram</h2><div class="diagram" id="diagramBox"></div></div>` : '';
    const regBlock = regs ? `<div class="card"><h2><span class="idx">R</span>Registers</h2><table class="fieldtable"><tbody>
      <tr><td class="mono">Reads</td><td>${regs.reads.map(r=>`<code>${esc(r)}</code>`).join(', ')||'&mdash;'}</td></tr>
      <tr><td class="mono">Writes</td><td>${regs.writes.map(r=>`<code>${esc(r)}</code>`).join(', ')||'&mdash;'}</td></tr>
    </tbody></table></div>` : '';
    const exBlock = `<div class="card"><h2><span class="idx">X</span>Exceptions</h2><ul style="margin:0;padding-left:18px">${ex.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`;
    app.innerHTML = `
    <div style="margin-bottom:14px"><a href="#/list" style="font-size:13px">&larr; Back to summary</a>
      <span style="float:right;font-size:13px">${prev?`<a href="#/inst/${encodeURIComponent(prev.name)}">&larr; ${esc(prev.name)}</a>`:''}${prev&&next?' · ':''}${next?`<a href="#/inst/${encodeURIComponent(next.name)}">${esc(next.name)} &rarr;</a>`:''}</span></div>
    <div class="card"><h1 style="font-size:26px;margin:0 0 6px"><span class="mono">${esc(inst.name)}</span></h1>
      <div style="margin-bottom:8px">${badges(inst)}</div>
      <p style="margin:0;color:var(--ink)">${esc(inst.desc||'')}${inst.detail?' <span style="color:var(--ink)">'+esc(inst.detail)+'</span>':''}</p></div>
    <div class="card"><h2><span class="idx">E</span>Encoding</h2>${renderEncoding(inst)}
      ${hex?`<div style="margin-top:10px;font-size:13px">Example machine code (operands&nbsp;=&nbsp;0): <code class="mono" style="font-weight:700">${esc(hex)}</code></div>`:''}</div>
    <div class="card"><h2><span class="idx">A</span>Assembler syntax</h2><pre class="code">${esc(inst.asm)}</pre></div>
    ${diag}${sail}${regBlock}${exBlock}`;
    if(inst.diagram) R.diagram.render(document.getElementById('diagramBox'), inst);
    try{ window.scrollTo(0,0); }catch(e){}
  }

  /* ---------- encoding space: hierarchical bit-decode tree ---------- */
  const byOp = {};
  list.forEach(i => { const o=(i.values&&i.values.opcode)||'C'; (byOp[o]=byOp[o]||[]).push(i); });
  const DECODE = {
    "0000011":["funct3"], "0000111":["funct3","mop","lumop"], "0001111":["funct3"],
    "0010011":["funct3","funct7"], "0011011":["funct3","funct7"], "0010111":[],
    "0100011":["funct3"], "0100111":["funct3","mop","lumop"], "0101111":["funct3","funct5"],
    "0110011":["funct3","funct7"], "0110111":[], "0111011":["funct3","funct7"],
    "1000011":["fmt"], "1000111":["fmt"], "1001011":["fmt"], "1001111":["fmt"],
    "1010011":["funct7","funct3","rs2"], "1010111":["funct3","funct6","vs1","vm"],
    "1100011":["funct3"], "1100111":[], "1101111":[],
    "1110011":["funct3","funct7","rs2"],
  };
  const FIELD_BITS = {"funct3":[14,12],"funct7":[31,25],"funct5":[31,27],"funct6":[31,26],"fmt":[26,25],"width":[14,12],"mop":[27,26],"lumop":[24,20],"rs2":[24,20],"vs1":[19,15],"vm":[25,25],"vs2":[24,20]};
  const FIELD_SHORT = {"funct3":"funct3","funct7":"funct7","funct5":"funct5","funct6":"funct6","fmt":"fmt","width":"width","opcode":"opcode","mop":"mop","lumop":"lumop/sumop","rs2":"rs2","vs1":"vs1","vm":"vm","vs2":"vs2"};
  const VSPACE = {"010000|010":"mask-count / move-to-scalar (VWXUNARY0)","010010|001":"FP/integer convert (VFUNARY0)","010011|001":"FP unary sqrt/rec/classify (VFUNARY1)","010010|010":"integer extend / bit ops (VXUNARY0)","010100|010":"mask set/scan/iota (VMUNARY0)","010111|000":"merge / copy (vm selects)","010111|011":"merge / copy (vm selects)","010111|100":"merge / copy (vm selects)","100111|011":"whole-register move (simm[2:0]=N-1)"};
  function fieldLabel(k){ return {"funct3":"funct3[14:12]","funct7":"funct7[31:25]","funct5":"funct5[31:27]","funct6":"funct6[31:26]","fmt":"fmt[26:25]","width":"width[14:12]","opcode":"opcode[6:0]","mop":"mop[27:26]","lumop":"lumop/sumop[24:20]","rs2":"rs2[24:20]","vs1":"vs1[19:15]","vm":"vm[25]","vs2":"vs2[24:20]"}[k]||k; }
  function groupBy(arr, key){
    const m = new Map();
    arr.forEach(i => { const k = (key && i.values && i.values[key]!==undefined) ? i.values[key] : "·"; if(!m.has(k)) m.set(k,[]); m.get(k).push(i); });
    return m;
  }
  function encLayout(op){
    const fields = [["opcode",6,0]];
    for(const key of (DECODE[op]||[])){ if(FIELD_BITS[key]) fields.push([key, FIELD_BITS[key][0], FIELD_BITS[key][1]]); }
    fields.sort((a,b)=>b[1]-a[1]);
    const segs = []; let pos = 31;
    for(const [name,hi,lo] of fields){
      if(pos > hi) segs.push(["", pos, hi+1]);
      segs.push([name, hi, lo]);
      pos = lo-1;
    }
    if(pos >= 0) segs.push(["", pos, 0]);
    return segs;
  }
  function encReg(layout, fixed, current){
    let head='<tr>'; for(let b=31;b>=0;b--) head+=`<td>${b}</td>`; head+='</tr>';
    let f1='<tr class="firstrow">';
    for(const [name,hi,lo] of layout){
      const w=hi-lo+1;
      if(fixed && fixed[name]){
        const bits=fixed[name].padStart(w,'0');
        for(let i=0;i<w;i++){ const c=(w===1)?'lr':(i===0?'l':(i===w-1?'r':'')); f1+=`<td class="${c}">${bits[i]}</td>`; }
      } else if(name && name===current){
        f1+=`<td colspan="${w}" class="lr">${esc(FIELD_SHORT[name]||name)}</td>`;
      } else {
        f1+=`<td colspan="${w}"></td>`;
      }
    }
    f1+='</tr>';
    return `<div class="regdiagram-32"><table class="regdiagram"><thead>${head}</thead><tbody>${f1}</tbody></table></div>`;
  }
  function encTable(field, rows){
    const trs = rows.map(r=>`<tr class="instructiontable"><td class="bitfield">${esc(r.v)}</td><td class="iformname">${r.label}</td></tr>`).join('');
    return `<div class="instructiontable"><table class="instructiontable"><tr><th>Decode fields</th><th rowspan="2">Instruction details</th></tr><tr><th class="bitfields">${esc(fieldLabel(field))}</th></tr>${trs}</table></div>`;
  }
  function valLabel(field, value, op){
    if(field==='mop')
      return {"00":"unit-stride (contiguous)","01":"indexed-unordered (gather)","10":"strided (fixed gap)","11":"indexed-ordered (gather, in order)"}[value] || value;
    if(field==='lumop')
      return {"00000":"regular (unit-stride)","01000":"whole register","01011":"mask (vlm/vsm)","10000":"fault-only-first"}[value] || value;
    if(field==='funct3'){
      if(op==='0000111'||op==='0100111'){
        const L = op==='0000111';
        return {
          "000":(L?"load":"store")+" 8-bit vector element",
          "101":(L?"load":"store")+" 16-bit vector element",
          "110":(L?"load":"store")+" 32-bit vector element",
          "111":(L?"load":"store")+" 64-bit vector element",
          "001":L?"load half-precision (FLH)":"store half-precision (FSH)",
          "010":L?"load single-precision (FLW)":"store single-precision (FSW)",
          "011":L?"load double-precision (FLD)":"store double-precision (FSD)",
          "100":L?"load quad-precision (FLQ)":"store quad-precision (FSQ)",
        }[value] || value;
      }
      if(op==='0110011'||op==='0111011') return {"000":"add / subtract","001":"shift left logical","010":"set less than (signed)","011":"set less than (unsigned)","100":"xor","101":"shift right logical / arithmetic","110":"or","111":"and"}[value] || value;
      if(op==='0010011'||op==='0011011') return {"000":"add immediate","001":"shift left logical immediate","010":"set less than immediate","011":"set less than immediate unsigned","100":"xor immediate","101":"shift right immediate","110":"or immediate","111":"and immediate"}[value] || value;
      if(op==='1100011') return {"000":"branch if equal","001":"branch if not equal","100":"branch if less than (signed)","101":"branch if greater or equal (signed)","110":"branch if less than (unsigned)","111":"branch if greater or equal (unsigned)"}[value] || value;
      if(op==='0000011') return {"000":"byte load (signed)","001":"halfword load (signed)","010":"word load","011":"doubleword load","100":"byte load (unsigned)","101":"halfword load (unsigned)","110":"word load (unsigned)"}[value] || value;
      if(op==='0100011') return {"000":"byte store","001":"halfword store","010":"word store","011":"doubleword store"}[value] || value;
      if(op==='0101111') return {"010":"word (32-bit)","011":"doubleword (64-bit)"}[value] || value;
      if(op==='1110011') return {"000":"trap / system","001":"CSR read-write (CSRRW)","010":"CSR read-set (CSRRS)","011":"CSR read-clear (CSRRC)","101":"CSR read-write immediate (CSRRWI)","110":"CSR read-set immediate (CSRRSI)","111":"CSR read-clear immediate (CSRRCI)"}[value] || value;
      if(op==='1010111') return {"000":"OPIVV (vector-vector integer)","001":"OPFVV (vector-vector FP)","010":"OPMVV (vector-vector mask)","011":"OPIVI (immediate integer)","100":"OPIVX (scalar integer)","101":"OPFVF (scalar FP)","110":"OPMVX (scalar mask)","111":"OPCFG (vsetvl)"}[value] || value;
      if(op==='0001111') return {"000":"fence (memory ordering)","001":"fence.i (instruction-fetch fence)"}[value] || value;
    }
    if(field==='funct7'){
      if(op==='1010011') return {
        "0000000":"add (single-precision)","0000001":"add (double-precision)",
        "0000100":"subtract (single)","0000101":"subtract (double)",
        "0001000":"multiply (single)","0001001":"multiply (double)",
        "0001100":"divide (single)","0001101":"divide (double)",
        "0101100":"square root (single)","0101101":"square root (double)",
        "0010000":"sign injection FSGNJ/FSGNJN/FSGNJX (single)","0010001":"sign injection FSGNJ/FSGNJN/FSGNJX (double)",
        "0010100":"minimum / maximum (single)","0010101":"minimum / maximum (double)",
        "1010000":"compare eq/lt/le (single)","1010001":"compare eq/lt/le (double)",
        "1110000":"classify / move-to-integer (single)","1110001":"classify / move-to-integer (double)",
        "1111000":"move integer to FP (single)","1111001":"move integer to FP (double)",
        "0100000":"convert double to single","0100001":"convert single to double",
        "1100000":"convert float to integer (W/WU/L/LU)","1100001":"convert float to integer (from double)",
        "1101000":"convert integer to single","1101001":"convert integer to double"
      }[value] || value;
      if(op==='1110011') return {"0000000":"ECALL / EBREAK","0001000":"SRET / WFI","0001001":"SFENCE.VMA","0011000":"MRET"}[value] || value;
      if(op==='0110011'||op==='0111011') return {"0000000":"add / shift / logic","0100000":"sub / sra","0000001":"mul / div / rem"}[value] || value;
      if(op==='0010011') return {"0000000":"logical shift (right)","0100000":"arithmetic shift (right)"}[value] || value;
    }
    if(field==='funct5')
      return {"00000":"atomic add","00001":"atomic swap","00010":"load-reserved (LR)","00011":"store-conditional (SC)","00100":"atomic xor","01000":"atomic or","01100":"atomic and","10000":"atomic min (signed)","10100":"atomic max (signed)","11000":"atomic min (unsigned)","11100":"atomic max (unsigned)"}[value] || value;
    if(field==='fmt') return {"00":"single-precision (S)","01":"double-precision (D)","10":"half-precision (H)","11":"quad-precision (Q)"}[value] || value;
    if(field==='rs2'){
      if(op==='1110011') return {"00000":"ECALL","00001":"EBREAK","00010":"SRET","00101":"WFI"}[value] || value;
      return {"00000":"W (signed 32-bit)","00001":"WU (unsigned 32-bit)","00010":"L (signed 64-bit)","00011":"LU (unsigned 64-bit)"}[value] || value;
    }
    if(field==='vm') return {"0":"masked (uses v0)","1":"unmasked"}[value] || value;
    return value;
  }
  function renderEncSpace(){
    const leaf = i => `<a href="#/inst/${encodeURIComponent(i.name)}">${esc(i.name)}</a>`;
    const ilist = ins => ins.map(leaf).join(', ');
    const labelled = (field, value, op, ins) => {
      const lb = valLabel(field, value, op);
      if(lb !== value) return `${esc(lb)} — ${ilist(ins)}`;
      if(ins.length === 1 && ins[0].desc) return `${ilist(ins)} <span style="color:var(--muted);font-size:12px">${esc(ins[0].desc)}</span>`;
      return ilist(ins);
    };
    const hasVariation = (ins, key) => ins.length>1 && new Set(ins.map(i => i.values && i.values[key]!==undefined ? i.values[key] : '·')).size > 1;
    const discField = (ins, fields) => fields.find(f => hasVariation(ins, f)) || null;
    const ordered = R.OPCODE_MAP.map(o=>o.op).filter(op => (byOp[op]||[]).length);
    const topRows = R.OPCODE_MAP.map(o => {
      const ins = byOp[o.op]||[];
      const fields = DECODE[o.op]||[];
      const label = !ins.length ? `<span style="color:var(--muted)">${esc(o.nm)} — ${esc(o.note||'')}</span>`
        : (fields.length ? `<a href="#enc-${o.op}">${esc(o.nm)}</a> <span style="color:var(--muted);font-size:12px">${esc(o.note||'')}</span>` : ilist(ins));
      return { v:o.op, label };
    });
    let html = `<h1 class="page-title">Encoding Space — RISC-V instruction set encoding</h1>
    <p class="page-sub">Recursive decode: each level fixes a field (shown 0/1 in the diagram above the table), names the next decode field, and the table lists the sub-groups — down to the instruction.</p>
    <h2 class="classheading" id="top">RISC-V instruction set encoding</h2>
    ${encReg([["",31,7],["opcode",6,0]], {}, "opcode")}
    ${encTable("opcode", topRows)}`;
    function node(op, meta, ins, fields, fixed, depth, id, title){
      const f = discField(ins, fields);
      if(!f) return '';
      const tag = depth===0 ? 'h2' : (depth===1 ? 'h3' : 'h4');
      const cls = depth===0 ? 'classheading' : 'iclass';
      const rest = fields.slice(fields.indexOf(f)+1);
      const g = [...groupBy(ins, f).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
      let out = `<${tag} class="${cls}" id="${id}">${title}</${tag}>
${encReg(encLayout(op), fixed, f)}
${encTable(f, g.map(([v,ins2])=>{
        const next = discField(ins2, rest);
        const linkLbl = (f==='funct6' && VSPACE[v+'|'+fixed.funct3]) || valLabel(f,v,op);
        return next
          ? { v, label:`<a href="#${id}-${v}">${esc(linkLbl)}</a>` }
          : { v, label: labelled(f,v,op,ins2) };
      }))}`;
      for(const [v,ins2] of g){
        const next = discField(ins2, rest);
        if(!next) continue;
        const hLbl = (f==='funct6' && VSPACE[v+'|'+fixed.funct3]) || valLabel(f,v,op);
        out += node(op, meta, ins2, rest, Object.assign({}, fixed, {[f]:v}), depth+1, `${id}-${v}`,
          `${esc(fieldLabel(f))} = ${esc(v)}${hLbl!==v?` <span class="opbin">(${esc(hLbl)})</span>`:''}`);
      }
      return out;
    }
    for(const op of ordered){
      const meta = R.OPCODE_MAP.find(m=>m.op===op);
      const ins = byOp[op]||[];
      const fields = DECODE[op]||[];
      if(!fields.length) continue;
      html += node(op, meta, ins, fields, {opcode:op}, 0, `enc-${op}`, `${op} — ${esc(meta.nm)} <span class="opbin">(${ins.length})</span>`);
    }
    app.innerHTML = html;
  }

  /* ---------- protection domains ---------- */
  function renderPriv(){
    const rings = R.PRIV_LEVELS.map(p => `<div class="ring ${p.css}"><h3>${esc(p.name)}</h3><div class="enc-bin">encoding ${p.enc}</div><p>${esc(p.desc)}</p></div>`).join('');
    const matrix = `<div class="matrix"><div class="hdr">Resource / instruction</div><div class="hdr">U</div><div class="hdr">S</div><div class="hdr">M</div>` + R.MODE_MATRIX.map(m => `<div class="lbl">${esc(m.row)}</div><div class="${m.u==='✓'?'yes':m.u==='—'?'no':''}">${esc(m.u)}</div><div class="${m.s==='✓'?'yes':m.s==='—'?'no':''}">${esc(m.s)}</div><div class="${m.m==='✓'?'yes':m.m==='—'?'no':''}">${esc(m.m)}</div>`).join('') + `</div>`;
    const privInst = `<table><thead><tr><th>Instruction</th><th>U</th><th>S</th><th>M</th><th>Notes</th></tr></thead><tbody>` + R.PRIV_INST.map(p => `<tr><td class="mnem">${esc(p.ins)}</td><td>${esc(p.u)}</td><td>${esc(p.s)}</td><td>${esc(p.m)}</td><td>${esc(p.note)}</td></tr>`).join('') + `</tbody></table>`;
    const csrMap = `<div class="csr-map">${Array.from({length:12},(_,k)=>{ const b=11-k; return `<div class="bit ${b>=10?'ro':(b>=8?'priv':'')}" title="bit ${b}">${b}</div>`; }).join('')}</div>` + R.CSR_ADDR.map(a=>`<div style="font-size:13px;margin:4px 0"><b>bits ${a.bits}</b> — ${esc(a.name)}: ${esc(a.desc)}</div>`).join('');
    const csrTbl = `<table><thead><tr><th>CSR</th><th>Min privilege</th><th>RO</th><th>Purpose</th></tr></thead><tbody>` + R.CSR_EXAMPLES.map(c => `<tr><td class="mono">${esc(c.name)}</td><td><span class="badge ext">${esc(c.priv)}</span></td><td>${c.ro?'yes':'no'}</td><td>${esc(c.desc)}</td></tr>`).join('') + `</tbody></table>`;
    const pmpModes = `<table><thead><tr><th>A[1:0]</th><th>Mode</th><th>Meaning</th></tr></thead><tbody>` + R.PMP_MODES.map(m => `<tr><td class="mono">${esc(m.a)}</td><td class="mono">${esc(m.name)}</td><td>${esc(m.desc)}</td></tr>`).join('') + `</tbody></table>`;
    const pmpFields = `<table><thead><tr><th>Bit</th><th>Meaning</th></tr></thead><tbody>` + R.PMP_FIELDS.map(f => `<tr><td class="mono">${esc(f.f)}</td><td>${esc(f.desc)}</td></tr>`).join('') + `</tbody></table>`;
    const pmpNotes = `<ul style="margin:10px 0 0;padding-left:18px;color:var(--muted);font-size:13px">` + R.PMP_NOTES.map(n=>`<li>${esc(n)}</li>`).join('') + `</ul>`;
    const pagingLevels = `<table><thead><tr><th>VA field</th><th>Bits</th><th>Role</th></tr></thead><tbody>` + R.PAGING.levels.map(l => `<tr><td class="mono">${esc(l.name)}</td><td class="mono">${esc(l.bits)}</td><td>${esc(l.tbl)}</td></tr>`).join('') + `</tbody></table>`;
    app.innerHTML = `
    <h1 class="page-title">Protection-Domain Classification</h1>
    <p class="page-sub">Privilege levels, the CSR address space, physical memory protection, and paging divide the ISA into protection domains.</p>
    <div class="card"><h2><span class="idx">1</span>Privilege levels</h2><div class="ring-wrap">${rings}</div>
      <p style="color:var(--muted);font-size:13px;margin:8px 0 0">A lower level can only access resources at its own level and below; the CSR address and the PTE U bit refine the isolation further.</p></div>
    <div class="card"><h2><span class="idx">2</span>Instruction / resource × privilege matrix</h2>${matrix}</div>
    <div class="card"><h2><span class="idx">3</span>Privileged instructions</h2>${privInst}</div>
    <div class="card"><h2><span class="idx">4</span>CSR address space (12-bit) domains</h2>${csrMap}
      <div style="margin:12px 0 6px;color:var(--muted);font-size:13px">The 12-bit CSR address encodes read/write attributes and the minimum privilege level, partitioning all 4096 CSRs into U/S/M domains.</div>${csrTbl}</div>
    <div class="grid cols-2">
      <div class="card"><h2><span class="idx">5</span>Physical Memory Protection (PMP)</h2>
        <p style="color:var(--muted);font-size:13px;margin-top:0">PMP partitions physical memory into up to 64 regions with R/W/X permissions — the M-mode physical isolation mechanism.</p>${pmpModes}<div style="margin-top:12px">${pmpFields}</div>${pmpNotes}</div>
      <div class="card"><h2><span class="idx">6</span>Paging (Sv39)</h2>
        <p style="color:var(--muted);font-size:13px;margin-top:0">${esc(R.PAGING.name)}: a three-level page table translates virtual to physical addresses; the PTE U/R/W/X bits form the virtual-memory protection domain.</p>${pagingLevels}
        <p style="color:var(--muted);font-size:12.5px;margin:10px 0 0">${esc(R.PAGING.pte)}</p>
        <ul style="margin:10px 0 0;padding-left:18px;color:var(--muted);font-size:13px">${R.PAGING.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></div>
    </div>`;
  }

  /* ---------- system registers (CSR) ---------- */
  function decodeCsrAddr(hex){
    const a = parseInt(hex,16);
    const rw = (a>>10)&3, priv=(a>>8)&3, num=a&0xff;
    return {rw: rw>=2?"read-only":"read/write", priv:["U","S","H","M"][priv], num:num.toString(16).toUpperCase().padStart(2,'0')};
  }
  function renderCsr(){
    const regs = R.CSR_REGS || [];
    // 12-bit address encoding
    let ruler='<tr class="ruler">', fields='<tr class="fields">';
    for(let b=11;b>=0;b--) ruler += `<td>${b}</td>`;
    for(const [label,hi,lo] of [["RW[11:10]",11,10],["priv[9:8]",9,8],["number[7:0]",7,0]]){
      fields += `<td colspan="${hi-lo+1}">${label}</td>`;
    }
    const vals = '<tr class="values">' + `<td colspan="2">RW/RO</td>` + `<td colspan="2">priv</td>` + `<td colspan="8">number</td>` + '</tr>';
    ruler += '</tr>'; fields += '</tr>';
    const encTable = `<div class="enc-wrap"><table class="enc-table" style="min-width:420px">${ruler}${fields}${vals}</table></div>`;
    const ex = decodeCsrAddr("0x300");
    // address map: rows = privilege layer (bits 9:8), columns = the four 0x400 columns
    const P = ["U","S","H","M"], Pidx = {U:0,S:1,H:2,M:3};
    const cols = [0x000,0x400,0x800,0xC00];
    const headers = `<div class="gh">bits 9:8</div>` + cols.map(c=>`<div class="gh">0x${c.toString(16).toUpperCase().padStart(3,'0')}–0x${(c+0x3FF).toString(16).toUpperCase().padStart(3,'0')}</div>`).join('');
    const rowsHtml = P.map(p => {
      const label = `<div class="rl">${p} · ${Pidx[p].toString(2).padStart(2,'0')}</div>`;
      const cells = cols.map(c => {
        const base = c + Pidx[p]*0x100;
        const names = regs.filter(r => { const a=parseInt(r.a,16); return a>=base && a<base+0x100; }).map(r=>r.n);
        return `<div class="csr-block"><div class="p">0x${base.toString(16).toUpperCase().padStart(3,'0')}</div><div class="names">${names.join(' ')||'—'}</div></div>`;
      }).join('');
      return label + cells;
    }).join('');
    const map = `<div class="csr-grid">${headers}${rowsHtml}</div>`;
    // register tables by privilege
    const PRIV = [["M","Machine-level"],["S","Supervisor-level"],["H","Hypervisor (H ext.)"],["U","User-level"]];
    let sections = "";
    for(const [pv,label] of PRIV){
      const rs = regs.filter(r=>r.p===pv).sort((a,b)=>parseInt(a.a,16)-parseInt(b.a,16));
      if(!rs.length) continue;
      const nodes = rs.map(r => {
        const bits = (r.bits&&r.bits.length) ? `<table class="fieldtable" style="margin-top:6px"><thead><tr><th>Field</th><th>Bits</th><th>Meaning</th></tr></thead><tbody>` +
          r.bits.map(bt=>`<tr><td class="mono">${esc(bt.f)}</td><td class="bits">${esc(bt.b)}</td><td>${esc(bt.d)}</td></tr>`).join('') + `</tbody></table>` : '';
        return `<details class="dec-node"><summary class="dec-head"><b>${esc(r.a)}</b> <span class="reg-name mono">${esc(r.n)}</span> <span class="sub">${r.ro?'read-only':'read/write'} — ${esc(r.d)}</span></summary><div class="dec-body">${bits||'<span style="color:var(--muted)">(no multi-bit fields)</span>'}</div></details>`;
      }).join('');
      sections += `<div class="card"><h2><span class="idx">${pv}</span>${esc(label)}</h2>${nodes}</div>`;
    }
    app.innerHTML = `
    <h1 class="page-title">System Registers (CSR)</h1>
    <p class="page-sub">The 12-bit CSR address itself is an encoding: it declares read/write access and the minimum privilege level of every system register.</p>
    <div class="card"><h2><span class="idx">1</span>CSR address encoding (12-bit)</h2>
      <p style="color:var(--muted);font-size:13px;margin-top:0">The <b>csr[11:0]</b> field of the CSR instructions is split into three sub-fields. This is how 4096 system registers are partitioned into protection domains.</p>
      ${encTable}
      <table class="fieldtable" style="max-width:720px"><thead><tr><th>Field</th><th>Bits</th><th>Meaning</th></tr></thead><tbody>
        <tr><td class="mono">RW[11:10]</td><td class="bits">[11:10]</td><td>Access attribute: 00/01 = read-write, 10/11 = read-only (bit 11 = RO).</td></tr>
        <tr><td class="mono">priv[9:8]</td><td class="bits">[9:8]</td><td>Minimum privilege: 00 = U, 01 = S, 10 = H, 11 = M.</td></tr>
        <tr><td class="mono">number[7:0]</td><td class="bits">[7:0]</td><td>Register number within the privilege level.</td></tr>
      </tbody></table>
      <p style="color:var(--muted);font-size:13px;margin:10px 0 0">Example: <code class="mono">0x300</code> = <code class="mono">00 11 00000000</code> → read/write, Machine level, number 0 → <b>mstatus</b>. A lower-privilege access (e.g. S or U reading 0x300) raises an illegal-instruction exception.</p>
    </div>
    <div class="card"><h2><span class="idx">2</span>Address-space map (bits 9:8 = privilege layer)</h2>
      <p style="color:var(--muted);font-size:13px;margin-top:0">Each 0x100 block belongs to one privilege layer; the same four layers repeat every 0x400.</p>
      ${map}
    </div>
    <h2 style="font-size:18px;margin:10px 0 12px">Register listing by privilege (expand a row for its bit fields)</h2>
    ${sections}`;
  }

  /* ---------- router ---------- */
  function route(){
    const h = location.hash || '#/';
    // in-page anchors (e.g. #enc-0000011, #top) must NOT re-render the app — the browser scrolls to them.
    if(!h.startsWith('#/')) return;
    let page = 'overview';
    if(h.startsWith('#/list')) page = 'list';
    else if(h.startsWith('#/enc')) page = 'enc';
    else if(h.startsWith('#/priv')) page = 'priv';
    else if(h.startsWith('#/csr')) page = 'csr';
    else if(h.startsWith('#/inst/')) page = 'detail:' + decodeURIComponent(h.slice(7));
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === page.split(':')[0]));
    if(page==='list') renderList();
    else if(page==='enc') renderEncSpace();
    else if(page==='priv') renderPriv();
    else if(page==='csr') renderCsr();
    else if(page.startsWith('detail:')) renderDetail(page.slice(7));
    else renderOverview();
  }
  topSearch.addEventListener('keydown', e => { if(e.key==='Enter'){ query=e.target.value; filterExt='All'; location.hash='#/list'; } });
  topSearch.addEventListener('input', e => { if(location.hash.startsWith('#/list')){ query=e.target.value; renderList(); } });
  window.addEventListener('hashchange', route);
  route();
})();
