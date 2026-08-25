/* Instruction behavior diagram: vertical element-flow (operands stacked with
 * operators between, bit-range label on top) — matches the reference style.
 */
window.RISCV = window.RISCV || {};
(function(){
  const R = window.RISCV;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const COLORS = {
    src:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
    dst:{fill:"#24292f",stroke:"#24292f",text:"#ffffff"},
    key:{fill:"#ffffff",stroke:"#0550ae",text:"#0550ae"},
    note:{fill:"#ffffff",stroke:"#24292f",text:"#24292f"},
  };
  const MONO = "ui-monospace,Menlo,Consolas,monospace";
  const SANS = "ui-sans-serif,system-ui,sans-serif";

  /* vertical flow: rows of operand boxes, operator symbols between them,
   * bit-range label on top (e.g. "31" / "0" or "SEW-1" / "0"). */
  function vflow(container, spec){
    const rows = spec.rows, ops = spec.ops || [];
    const W = 236, H = 46, gap = 40, pad = 10, labelH = spec.bits ? 20 : 0;
    const totalH = labelH + rows.length*H + (rows.length-1)*gap + pad;
    const svgW = W + 64;
    let s = `<svg width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}" xmlns="http://www.w3.org/2000/svg" role="img">`;
    if(spec.bits){
      s += `<text x="6" y="15" font-size="11" fill="#6e7781" font-family="${MONO}">${esc(spec.bits[0])}</text>`;
      s += `<text x="${W+58}" y="15" font-size="11" fill="#6e7781" font-family="${MONO}" text-anchor="end">${esc(spec.bits[1])}</text>`;
    }
    const x = 30;
    let y = labelH + 4;
    rows.forEach((r,i)=>{
      const c = COLORS[r.cls || "src"];
      s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="6" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.4"/>`;
      s += `<text x="${x+W/2}" y="${y+H/2-3}" text-anchor="middle" font-size="14" fill="${c.text}" font-family="${MONO}">${esc(r.label)}</text>`;
      if(r.sub) s += `<text x="${x+W/2}" y="${y+H/2+14}" text-anchor="middle" font-size="10" fill="#6e7781" font-family="${SANS}">${esc(r.sub)}</text>`;
      if(i < ops.length){
        const oy = y + H + 18;
        s += `<text x="${x+W/2}" y="${oy}" text-anchor="middle" font-size="20" fill="#57606a" font-family="${SANS}">${esc(ops[i])}</text>`;
      }
      y += H + gap;
    });
    s += `</svg>`;
    container.innerHTML = s;
  }

  const eW = e => e + "-bit element";
  const elem = (w) => `${w}-bit element`;

  R.diagram = {
    render(container, inst){
      const key = inst.diagram;
      if(key === "fmadd"){
        vflow(container, {
          bits:["31","0"],
          rows:[{label:"f[rs1]", sub:"32-bit"}, {label:"f[rs2]", sub:"32-bit"},
                {label:"f[rs3]", sub:"32-bit"}, {label:"f[rd]", sub:"32-bit", cls:"dst"}],
          ops:["+","×","="],
        });
        return;
      }
      const fn = this[key];
      if(fn) return fn(container, inst);
      container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px">Behavior diagram not generated yet.</div>`;
    },
    /* ---- element-wise / reduction ---- */
    vadd(container){ vflow(container, {
      bits:["SEW-1","0"],
      rows:[{label:"vs2[i]", sub:"SEW"}, {label:"vs1[i]", sub:"SEW"}, {label:"vd[i]", sub:"SEW", cls:"dst"}],
      ops:["+","="],
    }); },
    vwadd(container){ vflow(container, {
      bits:["2·SEW-1","0"],
      rows:[{label:"vs2[i]", sub:"SEW"}, {label:"vs1[i]", sub:"SEW"}, {label:"vd[i]", sub:"2·SEW (widening)", cls:"dst"}],
      ops:["+","="],
    }); },
    vnsrl(container){ vflow(container, {
      bits:["SEW-1","0"],
      rows:[{label:"vs2[i]", sub:"2·SEW"}, {label:"vd[i]", sub:"SEW (narrowing)", cls:"dst"}],
      ops:["≫","="],
    }); },
    vfmacc(container){ vflow(container, {
      bits:["SEW-1","0"],
      rows:[{label:"vs1[i]", sub:"SEW"}, {label:"vs2[i]", sub:"SEW"}, {label:"vd[i]", sub:"accumulator"}, {label:"vd = vs1·vs2 + vd", sub:"SEW", cls:"dst"}],
      ops:["×","+","="],
    }); },
    vredsum(container){ vflow(container, {
      bits:["SEW-1","0"],
      rows:[{label:"vs2[0..vl-1]", sub:"SEW elements"}, {label:"vs1[0]", sub:"SEW"}, {label:"vd[0]", sub:"SEW (reduced to scalar)", cls:"dst"}],
      ops:["Σ","="],
    }); },
    /* ---- loads / stores ---- */
    vle8(container){ vflow(container, {
      bits:["7","0"],
      rows:[{label:"mem[base + i]", sub:"8-bit element"}, {label:"vd[i]", sub:"8-bit element", cls:"dst"}],
      ops:["→"],
    }); },
    vse16(container){ vflow(container, {
      bits:["15","0"],
      rows:[{label:"vs3[i]", sub:"16-bit element"}, {label:"mem[base + i]", sub:"16-bit element", cls:"dst"}],
      ops:["→"],
    }); },
    vlse32(container){ vflow(container, {
      bits:["31","0"],
      rows:[{label:"mem[base + i·stride]", sub:"32-bit element"}, {label:"vd[i]", sub:"32-bit element", cls:"dst"}],
      ops:["→"],
    }); },
    vluxei16(container){ vflow(container, {
      bits:["15","0"],
      rows:[{label:"mem[base + vs2[i]]", sub:"16-bit element"}, {label:"vd[i]", sub:"16-bit element", cls:"dst"}],
      ops:["→"],
    }); },
  };
})();
