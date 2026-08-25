/*
 * RISC-V Vector ("V", RVV 1.0) instruction database.
 * OP-V major opcode = 1010111. Layout: funct6 · vm · vs2 · vs1/rs1/imm · funct3 · vd.
 * funct3: 000 OPIVV · 001 OPFVV · 010 OPMVV · 011 OPIVI · 100 OPIVX · 101 OPFVF · 110 OPMVX · 111 OPCFG
 * Golden models follow the Operation clauses of the ISA manual / sail-riscv.
 */
window.RISCV = window.RISCV || {};
(function(){
  const V = [];
  const add = o => V.push(o);

  /* funct3 for the four integer operand-source forms */
  const F3 = {vv:"000", vx:"100", vi:"011", vs:"010", vf:"101", wv:"000", wx:"100", wi:"011", vvm:"000", vxm:"100", vim:"011"};
  const F3F = {vv:"001", vf:"101", vs:"001"};

  function vop(name, asm, f6, f3, group, desc, sail, extra){
    const values = {funct6:f6, funct3:f3, opcode:"1010111"};
    if(extra) Object.assign(values, extra);
    add({name, ext:"V", type:"V", asm, values, group, desc, sail});
  }
  function vcfg(name, asm, f2, desc, sail){
    add({name, ext:"V", type:"VCFG", asm, values:{funct2:f2, funct3:"111", funct6:f2, opcode:"1010111"}, group:"V-CFG", desc, sail});
  }
  function vldst(name, asm, op, width, nf, mop, lumop, vm, group, desc, sail){
    add({name, ext:"V", type:"VLD", asm, values:{opcode:op, width, funct3:width, nf, mop, lumop, vm}, group, desc, sail});
  }
  const G = {ARITH:"V-ARITH", RED:"V-RED", MASK:"V-MASK", PERM:"V-PERM", FP:"V-FP", CVT:"V-CVT", CMP:"V-CMP", LD:"V-LD-ST", CRYPTO:"V-CRYPTO"};

  const SAIL = {
    vadd:{vv:"vs2 + vs1", vx:"vs2 + RS1", vi:"vs2 + insn.v_i_imm()"},
    vsub:{vv:"vs2 - vs1", vx:"vs2 - RS1"},
    vrsub:{vx:"RS1 - vs2", vi:"insn.v_i_imm() - vs2"},
    vminu:{vv:"std::min(vs2, vs1)", vx:"std::min(vs2, RS1)"},
    vmin:{vv:"std::min(vs2, vs1)", vx:"std::min(vs2, RS1)"},
    vmaxu:{vv:"std::max(vs2, vs1)", vx:"std::max(vs2, RS1)"},
    vmax:{vv:"std::max(vs2, vs1)", vx:"std::max(vs2, RS1)"},
    vaaddu:{vv:"(vs2 + vs1 + 1) >> 1", vx:"(vs2 + RS1 + 1) >> 1"},
    vaadd:{vv:"roundoff_signed(vs2 + vs1, 1)", vx:"roundoff_signed(vs2 + RS1, 1)"},
    vasubu:{vv:"roundoff_unsigned(vs2 - vs1, 1)", vx:"roundoff_unsigned(vs2 - RS1, 1)"},
    vasub:{vv:"roundoff_signed(vs2 - vs1, 1)", vx:"roundoff_signed(vs2 - RS1, 1)"},
    vand:{vv:"vs2 & vs1", vx:"vs2 & RS1", vi:"vs2 & insn.v_i_imm()"},
    vor:{vv:"vs2 | vs1", vx:"vs2 | RS1", vi:"vs2 | insn.v_i_imm()"},
    vxor:{vv:"vs2 ^ vs1", vx:"vs2 ^ RS1", vi:"vs2 ^ insn.v_i_imm()"},
    vrgather:{vv:"vs2[vs1]", vx:"vs2[RS1]", vi:"vs2[insn.v_i_imm()]"},
    vrgatherei16:{vv:"vs2[vs1]"},
    vadc:{vvm:"vs2 + vs1 + v0[i]", vxm:"vs2 + RS1 + v0[i]", vim:"vs2 + insn.v_i_imm() + v0[i]"},
    vmadc:{vvm:"carry_out(vs2 + vs1 + v0[i])", vxm:"carry_out(vs2 + RS1 + v0[i])", vim:"carry_out(vs2 + insn.v_i_imm() + v0[i])"},
    vsbc:{vvm:"vs2 - vs1 - v0[i]", vxm:"vs2 - RS1 - v0[i]"},
    vmsbc:{vvm:"borrow_out(vs2 - vs1 - v0[i])", vxm:"borrow_out(vs2 - RS1 - v0[i])"},
    vmerge:{vvm:"v0[i] ? vs1 : vs2", vxm:"v0[i] ? RS1 : vs2", vim:"v0[i] ? insn.v_i_imm() : vs2"},
    vmseq:{vv:"vs2 == vs1", vx:"vs2 == RS1", vi:"vs2 == insn.v_i_imm()"},
    vmsne:{vv:"vs2 != vs1", vx:"vs2 != RS1", vi:"vs2 != insn.v_i_imm()"},
    vmsltu:{vv:"vs2 < vs1", vx:"vs2 < RS1"},
    vmslt:{vv:"vs2 < vs1", vx:"vs2 < RS1"},
    vmsleu:{vv:"vs2 <= vs1", vx:"vs2 <= RS1", vi:"vs2 <= insn.v_i_imm()"},
    vmsle:{vv:"vs2 <= vs1", vx:"vs2 <= RS1", vi:"vs2 <= insn.v_i_imm()"},
    vmsgtu:{vx:"vs2 > RS1", vi:"vs2 > insn.v_i_imm()"},
    vmsgt:{vx:"vs2 > RS1", vi:"vs2 > insn.v_i_imm()"},
    vsaddu:{vv:"satu_add_u(vs2, vs1)", vx:"satu_add_u(vs2, RS1)", vi:"satu_add_u(vs2, insn.v_i_imm())"},
    vsadd:{vv:"satu_add_s(vs2, vs1)", vx:"satu_add_s(vs2, RS1)", vi:"satu_add_s(vs2, insn.v_i_imm())"},
    vssubu:{vv:"satu_sub_u(vs2, vs1)", vx:"satu_sub_u(vs2, RS1)"},
    vssub:{vv:"satu_sub_s(vs2, vs1)", vx:"satu_sub_s(vs2, RS1)"},
    vmulhu:{vv:"mulhu(vs2, vs1)", vx:"mulhu(vs2, RS1)"},
    vsll:{vv:"vs2 << vs1", vx:"vs2 << RS1", vi:"vs2 << insn.v_i_imm()"},
    vmul:{vv:"vs2 * vs1", vx:"vs2 * RS1"},
    vmulhsu:{vv:"mulhsu(vs2, vs1)", vx:"mulhsu(vs2, RS1)"},
    vsmul:{vv:"clip(roundoff_signed(vs2 * vs1, SEW-1))", vx:"clip(roundoff_signed(vs2 * RS1, SEW-1))"},
    vmulh:{vv:"mulh(vs2, vs1)", vx:"mulh(vs2, RS1)"},
    vsrl:{vv:"vs2 >> vs1", vx:"vs2 >> RS1", vi:"vs2 >> insn.v_i_imm()"},
    vsra:{vv:"sext(vs2) >> vs1", vx:"sext(vs2) >> RS1", vi:"sext(vs2) >> insn.v_i_imm()"},
    vssrl:{vv:"ssrl(vs2, vs1)", vx:"ssrl(vs2, RS1)", vi:"ssrl(vs2, insn.v_i_imm())"},
    vssra:{vv:"ssra(vs2, vs1)", vx:"ssra(vs2, RS1)", vi:"ssra(vs2, insn.v_i_imm())"},
    vnsrl:{wv:"narrow(vs2 >> vs1)", wx:"narrow(vs2 >> RS1)", wi:"narrow(vs2 >> insn.v_i_imm())"},
    vnsra:{wv:"narrow(sext(vs2) >> vs1)", wx:"narrow(sext(vs2) >> RS1)", wi:"narrow(sext(vs2) >> insn.v_i_imm())"},
    vnclipu:{wv:"nclipu(vs2 >> vs1)", wx:"nclipu(vs2 >> RS1)", wi:"nclipu(vs2 >> insn.v_i_imm())"},
    vnclip:{wv:"nclip(vs2 >> vs1)", wx:"nclip(vs2 >> RS1)", wi:"nclip(vs2 >> insn.v_i_imm())"},
    vwaddu:{vv:"sext(vs2) + sext(vs1)", vx:"sext(vs2) + sext(RS1)"},
    vwadd:{vv:"sext(vs2) + sext(vs1)", vx:"sext(vs2) + sext(RS1)"},
    vwsubu:{vv:"sext(vs2) - sext(vs1)", vx:"sext(vs2) - sext(RS1)"},
    vwsub:{vv:"sext(vs2) - sext(vs1)", vx:"sext(vs2) - sext(RS1)"},
    "vwaddu.w":{vv:"sext(vs2) + vs1", vx:"sext(vs2) + RS1"},
    "vwadd.w":{vv:"sext(vs2) + vs1", vx:"sext(vs2) + RS1"},
    "vwsubu.w":{vv:"sext(vs2) - vs1", vx:"sext(vs2) - RS1"},
    "vwsub.w":{vv:"sext(vs2) - vs1", vx:"sext(vs2) - RS1"},
    vwmulu:{vv:"sext(vs2) * sext(vs1)", vx:"sext(vs2) * sext(RS1)"},
    vwmulsu:{vv:"sext(vs2) * sext(vs1)", vx:"sext(vs2) * sext(RS1)"},
    vwmul:{vv:"sext(vs2) * sext(vs1)", vx:"sext(vs2) * sext(RS1)"},
    vwmaccu:{vv:"vd + sext(vs2) * sext(vs1)", vx:"vd + sext(vs2) * sext(RS1)"},
    vwmacc:{vv:"vd + sext(vs2) * sext(vs1)", vx:"vd + sext(vs2) * sext(RS1)"},
    vwmaccus:{vx:"vd + sext(vs2) * RS1"},
    vwmaccsu:{vv:"vd + sext(vs2) * sext(vs1)", vx:"vd + sext(vs2) * sext(RS1)"},
    vfadd:{vv:"fadd(vs2, vs1)", vf:"fadd(vs2, FRS1)"},
    vfsub:{vv:"fsub(vs2, vs1)", vf:"fsub(vs2, FRS1)"},
    vfmin:{vv:"fmin(vs2, vs1)", vf:"fmin(vs2, FRS1)"},
    vfmax:{vv:"fmax(vs2, vs1)", vf:"fmax(vs2, FRS1)"},
    vfsgnj:{vv:"fsgnj(vs2, vs1)", vf:"fsgnj(vs2, FRS1)"},
    vfsgnjn:{vv:"fsgnjn(vs2, vs1)", vf:"fsgnjn(vs2, FRS1)"},
    vfsgnjx:{vv:"fsgnjx(vs2, vs1)", vf:"fsgnjx(vs2, FRS1)"},
    vfdiv:{vv:"fdiv(vs2, vs1)", vf:"fdiv(vs2, FRS1)"},
    vfrdiv:{vf:"fdiv(FRS1, vs2)"},
    vfmul:{vv:"fmul(vs2, vs1)", vf:"fmul(vs2, FRS1)"},
    vfrsub:{vf:"fsub(FRS1, vs2)"},
    vfmadd:{vv:"fmadd(vs2, vs1, vd)", vf:"fmadd(vs2, FRS1, vd)"},
    vfnmadd:{vv:"fnmadd(vs2, vs1, vd)", vf:"fnmadd(vs2, FRS1, vd)"},
    vfmsub:{vv:"fmsub(vs2, vs1, vd)", vf:"fmsub(vs2, FRS1, vd)"},
    vfnmsub:{vv:"fnmsub(vs2, vs1, vd)", vf:"fnmsub(vs2, FRS1, vd)"},
    vfmacc:{vv:"fmadd(vs1, vs2, vd)", vf:"fmadd(FRS1, vs2, vd)"},
    vfnmacc:{vv:"fnmadd(vs1, vs2, vd)", vf:"fnmadd(FRS1, vs2, vd)"},
    vfmsac:{vv:"fmsub(vs1, vs2, vd)", vf:"fmsub(FRS1, vs2, vd)"},
    vfnmsac:{vv:"fnmsub(vs1, vs2, vd)", vf:"fnmsub(FRS1, vs2, vd)"},
    vfwmul:{vv:"fmul(sext(vs2), sext(vs1))", vf:"fmul(sext(vs2), FRS1)"},
    vfwmacc:{vv:"fmadd(sext(vs1), sext(vs2), vd)", vf:"fmadd(FRS1, sext(vs2), vd)"},
    vfwnmacc:{vv:"fnmadd(sext(vs1), sext(vs2), vd)", vf:"fnmadd(FRS1, sext(vs2), vd)"},
    vfwmsac:{vv:"fmsub(sext(vs1), sext(vs2), vd)", vf:"fmsub(FRS1, sext(vs2), vd)"},
    vfwnmsac:{vv:"fnmsub(sext(vs1), sext(vs2), vd)", vf:"fnmsub(FRS1, sext(vs2), vd)"},
    vfwadd:{vv:"fadd(sext(vs2), sext(vs1))", vf:"fadd(sext(vs2), FRS1)"},
    vfwsub:{vv:"fsub(sext(vs2), sext(vs1))", vf:"fsub(sext(vs2), FRS1)"},
    "vfwadd.w":{vv:"fadd(sext(vs2), vs1)", vf:"fadd(sext(vs2), FRS1)"},
    "vfwsub.w":{vv:"fsub(sext(vs2), vs1)", vf:"fsub(sext(vs2), FRS1)"},
    vmfeq:{vv:"vs2 == vs1", vf:"vs2 == FRS1"}, vmfne:{vv:"vs2 != vs1", vf:"vs2 != FRS1"},
    vmflt:{vv:"vs2 < vs1", vf:"vs2 < FRS1"}, vmfle:{vv:"vs2 <= vs1", vf:"vs2 <= FRS1"},
    vmfgt:{vv:"vs2 > vs1", vf:"vs2 > FRS1"}, vmfge:{vv:"vs2 >= vs1", vf:"vs2 >= FRS1"},
    vfredusum:{vs:"unordered_sum(vs2)"}, vfredosum:{vs:"ordered_sum(vs2)"},
    vfredmin:{vs:"fmin_reduce(vs2)"}, vfredmax:{vs:"fmax_reduce(vs2)"},
    vfwredusum:{vs:"unordered_sum(sext(vs2))"}, vfwredosum:{vs:"ordered_sum(sext(vs2))"},
  };
  const LOOPMAC = {vv:"VI_VV_LOOP", vx:"VI_VX_LOOP", vi:"VI_VI_LOOP", vf:"VI_VF_LOOP", vvm:"VI_VV_LOOP", vxm:"VI_VX_LOOP", vim:"VI_VI_LOOP", wv:"VI_WIDE_VV_LOOP", wx:"VI_WIDE_VX_LOOP", wi:"VI_WIDE_VI_LOOP", mm:"VI_MM_LOOP", vs:"VI_VV_LOOP"};
  function vsail(mn, form){
    const e = SAIL[mn] && SAIL[mn][form];
    if(!e) return undefined;
    return `require_vector_vs;\n${LOOPMAC[form]||"VI_VV_LOOP"} { vd = ${e}; }`;
  }
  const RED_EXPR = {vredsum:"acc + P.VU.elt(rs2, i)", vredand:"acc & P.VU.elt(rs2, i)", vredor:"acc | P.VU.elt(rs2, i)", vredxor:"acc ^ P.VU.elt(rs2, i)", vredminu:"std::min(acc, P.VU.elt(rs2, i))", vredmin:"std::min(acc, P.VU.elt(rs2, i))", vredmaxu:"std::max(acc, P.VU.elt(rs2, i))", vredmax:"std::max(acc, P.VU.elt(rs2, i))", vwredsumu:"acc + sext(P.VU.elt(rs2, i))", vwredsum:"acc + sext(P.VU.elt(rs2, i))"};
  const MASK_EXPR = {vmand:"vs2 & vs1", vmnand:"~(vs2 & vs1)", vmandn:"vs2 & ~vs1", vmxor:"vs2 ^ vs1", vmor:"vs2 | vs1", vmnor:"~(vs2 | vs1)", vmorn:"vs2 | ~vs1", vmxnor:"~(vs2 ^ vs1)"};


  /* ================= configuration ================= */
  vcfg("vsetvli","vsetvli rd, rs1, vtypei","00",
    "Set vl/vtype from rs1 (requested AVL) and the 11-bit vtypei immediate.",
    "require_vector_vs;\nWRITE_RD(P.VU.set_vl(RS1, RD, insn.zimm()));");
  vcfg("vsetivli","vsetivli rd, uimm, vtypei","01",
    "Set vl/vtype from a 5-bit zero-extended AVL immediate.",
    "require_vector_vs;\nWRITE_RD(P.VU.set_vl(insn.rs1(), RD, insn.zimm()));");
  vcfg("vsetvl","vsetvl rd, rs1, rs2","11",
    "Set vl/vtype from rs1 (AVL) and rs2 (new vtype).",
    "require_vector_vs;\nWRITE_RD(P.VU.set_vl(RS1, RD, RS2));");

  /* ================= loads / stores ================= */
  const W = {"8":"000","16":"101","32":"110","64":"111"};
  for(const e of ["8","16","32","64"]){
    vldst("vle"+e+".v","vle"+e+".v vd, (rs1), vm", "0000111", W[e], "000", "00", "00000", "0", G.LD,
      `Vector unit-stride ${e}-bit load.`,
      "require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  P.VU.elt<uint"+e+"_t>(rd, i, true) = MMU.load<uint"+e+"_t>(RS1 + i * "+(e/8)+");\nP.VU.vstart = 0;");
    vldst("vse"+e+".v","vse"+e+".v vs3, (rs1), vm", "0100111", W[e], "000", "00", "00000", "0", G.LD,
      `Vector unit-stride ${e}-bit store.`,
      "require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  MMU.store<uint"+e+"_t>(RS1 + i * "+(e/8)+", P.VU.elt<uint"+e+"_t>(rd, i));  // rd field = vs3 data\nP.VU.vstart = 0;");
    vldst("vlse"+e+".v","vlse"+e+".v vd, (rs1), rs2, vm", "0000111", W[e], "000", "10", "00000", "0", G.LD, `Strided ${e}-bit load (stride in rs2).`,
      `require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  P.VU.elt<uint${e}_t>(rd, i, true) = MMU.load<uint${e}_t>(RS1 + i * RS2);\nP.VU.vstart = 0;`);
    vldst("vsse"+e+".v","vsse"+e+".v vs3, (rs1), rs2, vm", "0100111", W[e], "000", "10", "00000", "0", G.LD, `Strided ${e}-bit store.`,
      `require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  MMU.store<uint${e}_t>(RS1 + i * RS2, P.VU.elt<uint${e}_t>(rd, i));\nP.VU.vstart = 0;`);
    vldst("vluxei"+e+".v","vluxei"+e+".v vd, (rs1), vs2, vm", "0000111", W[e], "000", "01", "00000", "0", G.LD, `Unordered indexed ${e}-bit load.`,
      `require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  P.VU.elt<uint${e}_t>(rd, i, true) = MMU.load<uint${e}_t>(RS1 + P.VU.elt<uint${e}_t>(rs2, i));\nP.VU.vstart = 0;`);
    vldst("vloxei"+e+".v","vloxei"+e+".v vd, (rs1), vs2, vm", "0000111", W[e], "000", "11", "00000", "0", G.LD, `Ordered indexed ${e}-bit load.`,
      `require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  P.VU.elt<uint${e}_t>(rd, i, true) = MMU.load<uint${e}_t>(RS1 + P.VU.elt<uint${e}_t>(rs2, i));\nP.VU.vstart = 0;`);
    vldst("vsuxei"+e+".v","vsuxei"+e+".v vs3, (rs1), vs2, vm", "0100111", W[e], "000", "01", "00000", "0", G.LD, `Unordered indexed ${e}-bit store.`,
      `require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  MMU.store<uint${e}_t>(RS1 + P.VU.elt<uint${e}_t>(rs2, i), P.VU.elt<uint${e}_t>(rd, i));\nP.VU.vstart = 0;`);
    vldst("vsoxei"+e+".v","vsoxei"+e+".v vs3, (rs1), vs2, vm", "0100111", W[e], "000", "11", "00000", "0", G.LD, `Ordered indexed ${e}-bit store.`,
      `require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  MMU.store<uint${e}_t>(RS1 + P.VU.elt<uint${e}_t>(rs2, i), P.VU.elt<uint${e}_t>(rd, i));\nP.VU.vstart = 0;`);
  }
  vldst("vle8ff.v","vle8ff.v vd, (rs1), vm", "0000111","000","000","00","10000","0",G.LD,
    "Unit-stride fault-only-first 8-bit load (stops on first fault, updates vl).",
    "require_vector_vs;\nreg_t i = P.VU.vstart;\nfor (; i < P.VU.vl && !P.VU.first_fault; ++i)\n  P.VU.elt<uint8_t>(rd, i, true) = MMU.load<uint8_t>(RS1 + i);\nP.VU.vl = i;  // updated on fault\nP.VU.vstart = 0;");
  vldst("vlm.v","vlm.v vd, (rs1)","0000111","000","000","00","01011","1",G.LD,"Load a byte vector of mask elements (length ceil(vl/8)).",
    "require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  P.VU.elt<uint8_t>(rd, i, true) = MMU.load<uint8_t>(RS1 + (i >> 3));\nP.VU.vstart = 0;");
  vldst("vsm.v","vsm.v vs3, (rs1)","0100111","000","000","00","01011","1",G.LD,"Store a byte vector of mask elements.",
    "require_vector_vs;\nfor (reg_t i = P.VU.vstart; i < P.VU.vl; ++i)\n  MMU.store<uint8_t>(RS1 + (i >> 3), P.VU.elt<uint8_t>(rd, i));\nP.VU.vstart = 0;");
  const WREG = {1:"8",2:"16",4:"32",8:"64"};
  for(const n of [1,2,4,8]){
    vldst("vl"+n+"re"+WREG[n]+".v","vl"+n+"re"+WREG[n]+".v vd, (rs1)","0000111",W[WREG[n]],String(n-1),"00","01000","1",G.LD, `Load ${n} whole vector register(s).`,
      `require_vector_vs;\nfor (reg_t i = 0; i < ${n}; ++i)\n  P.VU.elt<uint${WREG[n]}_t>(rd + i, 0, true) = MMU.load<uint${WREG[n]}_t>(RS1 + i * (${WREG[n]}/8));\nP.VU.vstart = 0;`);
    vldst("vs"+n+"r.v","vs"+n+"r.v vs3, (rs1)","0100111",W[WREG[n]],String(n-1),"00","01000","1",G.LD, `Store ${n} whole vector register(s).`,
      `require_vector_vs;\nfor (reg_t i = 0; i < ${n}; ++i)\n  MMU.store<uint${WREG[n]}_t>(RS1 + i * (${WREG[n]}/8), P.VU.elt<uint${WREG[n]}_t>(rd + i, 0));\nP.VU.vstart = 0;`);
  }

  /* ================= integer arithmetic ================= */
  // each: [mnemonic, funct6, forms(vv/vx/vi), group, desc]
  const INT = [
    ["vadd","000000","vv vx vi",G.ARITH,"Element-wise integer add."],
    ["vsub","000010","vv vx",G.ARITH,"Element-wise integer subtract."],
    ["vrsub","000011","vx vi",G.ARITH,"Reverse subtract (scalar/immediate minus vector)."],
    ["vminu","000100","vv vx",G.ARITH,"Element-wise unsigned minimum."],
    ["vmin","000101","vv vx",G.ARITH,"Element-wise signed minimum."],
    ["vmaxu","000110","vv vx",G.ARITH,"Element-wise unsigned maximum."],
    ["vmax","000111","vv vx",G.ARITH,"Element-wise signed maximum."],
    ["vaaddu","001000","vv vx",G.ARITH,"Unsigned averaging add (roundoff)."],
    ["vaadd","001001","vv vx",G.ARITH,"Signed averaging add (roundoff)."],
    ["vasubu","001010","vv vx",G.ARITH,"Unsigned averaging subtract."],
    ["vasub","001011","vv vx",G.ARITH,"Signed averaging subtract."],
    ["vand","001001","vv vx vi",G.ARITH,"Element-wise bitwise AND."],
    ["vor","001010","vv vx vi",G.ARITH,"Element-wise bitwise OR."],
    ["vxor","001011","vv vx vi",G.ARITH,"Element-wise bitwise XOR."],
    ["vrgather","001100","vv vx vi",G.PERM,"Gather elements by index."],
    ["vrgatherei16","001110","vv",G.PERM,"Gather with 16-bit indices."],
    ["vadc","010000","vvm vxm vim",G.ARITH,"Add with carry-in (mask v0 is carry)."],
    ["vmadc","010001","vvm vxm vim",G.ARITH,"Add producing carry-out into mask."],
    ["vsbc","010010","vvm vxm",G.ARITH,"Subtract with borrow-in."],
    ["vmsbc","010011","vvm vxm",G.ARITH,"Subtract producing borrow-out into mask."],
    ["vmerge","010111","vvm vxm vim",G.PERM,"Merge: vd[i] = mask ? op1 : vs2[i]."],
    ["vmseq","011000","vv vx vi",G.CMP,"Compare equal → mask."],
    ["vmsne","011001","vv vx vi",G.CMP,"Compare not-equal → mask."],
    ["vmsltu","011010","vv vx",G.CMP,"Unsigned less-than → mask."],
    ["vmslt","011011","vv vx",G.CMP,"Signed less-than → mask."],
    ["vmsleu","011100","vv vx vi",G.CMP,"Unsigned less-or-equal → mask."],
    ["vmsle","011101","vv vx vi",G.CMP,"Signed less-or-equal → mask."],
    ["vmsgtu","011110","vx vi",G.CMP,"Unsigned greater-than → mask."],
    ["vmsgt","011111","vx vi",G.CMP,"Signed greater-than → mask."],
    ["vsaddu","100000","vv vx vi",G.ARITH,"Saturating unsigned add."],
    ["vsadd","100001","vv vx vi",G.ARITH,"Saturating signed add."],
    ["vssubu","100010","vv vx",G.ARITH,"Saturating unsigned subtract."],
    ["vssub","100011","vv vx",G.ARITH,"Saturating signed subtract."],
    ["vmulhu","100100","vv vx",G.ARITH,"Unsigned multiply returning high half."],
    ["vsll","100101","vv vx vi",G.ARITH,"Element-wise logical left shift."],
    ["vmul","100101","vv vx",G.ARITH,"Element-wise integer multiply (low half)."],
    ["vmulhsu","100110","vv vx",G.ARITH,"Signed×unsigned multiply high."],
    ["vsmul","100111","vv vx",G.ARITH,"Fixed-point saturating multiply."],
    ["vmulh","100111","vv vx",G.ARITH,"Signed multiply returning high half."],
    ["vsrl","101000","vv vx vi",G.ARITH,"Element-wise logical right shift."],
    ["vsra","101001","vv vx vi",G.ARITH,"Element-wise arithmetic right shift."],
    ["vssrl","101010","vv vx vi",G.ARITH,"Saturating logical right shift (fixed-point)."],
    ["vssra","101011","vv vx vi",G.ARITH,"Saturating arithmetic right shift."],
    ["vnsrl","101100","wv wx wi",G.ARITH,"Narrowing logical right shift (2*SEW → SEW)."],
    ["vnsra","101101","wv wx wi",G.ARITH,"Narrowing arithmetic right shift."],
    ["vnclipu","101110","wv wx wi",G.ARITH,"Narrowing unsigned clip (fixed-point)."],
    ["vnclip","101111","wv wx wi",G.ARITH,"Narrowing signed clip."],
  ];
  const OP = {vv:["vs1","vs1"], vx:["rs1","rs1"], vi:["imm","imm"], vvm:["vs1","vs1"], vxm:["rs1","rs1"], vim:["imm","imm"], wv:["vs1","vs1"], wx:["rs1","rs1"], wi:["imm","imm"]};
  const OPMM = new Set(["vaaddu","vaadd","vasubu","vasub","vmul","vmulh"]);
  for(const [mn,f6,forms,g,d] of INT){
    for(const f of forms.split(" ")){
      const operand = OP[f][0];
      const asm = `${mn}.${f} vd, vs2, ${operand}, vm`;
      const f3map = OPMM.has(mn) ? {vv:"010",vx:"110",vi:"011"} : F3;
      vop(mn+"."+f, asm, f6, f3map[f], g, d, vsail(mn,f), mn==="vmerge" ? {vm:"0"} : undefined);
    }
  }

  /* ================= widening integer ================= */
  const WIDEN = [
    ["vwaddu","110000","vv vx","Unsigned widening add."],
    ["vwadd","110001","vv vx","Signed widening add."],
    ["vwsubu","110010","vv vx","Unsigned widening subtract."],
    ["vwsub","110011","vv vx","Signed widening subtract."],
    ["vwaddu.w","110100","vv vx","Widening add, first operand single-width (unsigned)."],
    ["vwadd.w","110101","vv vx","Widening add, first operand single-width (signed)."],
    ["vwsubu.w","110110","vv vx","Widening subtract, first operand single-width (unsigned)."],
    ["vwsub.w","110111","vv vx","Widening subtract, first operand single-width (signed)."],
    ["vwmulu","111000","vv vx","Unsigned widening multiply."],
    ["vwmulsu","111010","vv vx","Signed×unsigned widening multiply."],
    ["vwmul","111011","vv vx","Signed widening multiply."],
    ["vwmaccu","111100","vv vx","Unsigned widening multiply-accumulate."],
    ["vwmacc","111101","vv vx","Signed widening multiply-accumulate."],
    ["vwmaccus","111110","vx","Widening multiply-accumulate, unsigned×signed."],
    ["vwmaccsu","111111","vv vx","Widening multiply-accumulate, signed×unsigned."],
  ];
  for(const [mn,f6,forms,d] of WIDEN){
    for(const f of forms.split(" ")){
      vop(mn+"."+f, `${mn}.${f} vd, vs2, ${OP[f][0]}, vm`, f6, F3[f], G.ARITH, d, vsail(mn,f));
    }
  }

  /* ================= reductions (.vs, OPMVV funct3=010) ================= */
  const RED = [
    ["vredsum","000000","Sum reduction."],["vredand","000001","Bitwise AND reduction."],
    ["vredor","000010","Bitwise OR reduction."],["vredxor","000011","Bitwise XOR reduction."],
    ["vredminu","000100","Unsigned minimum reduction."],["vredmin","000101","Signed minimum reduction."],
    ["vredmaxu","000110","Unsigned maximum reduction."],["vredmax","000111","Signed maximum reduction."],
    ["vwredsumu","110000","Widening unsigned sum reduction."],["vwredsum","110001","Widening signed sum reduction."],
  ];
  for(const [mn,f6,d] of RED){
    vop(mn+".vs", `${mn}.vs vd, vs2, vs1, vm`, f6, "010", G.RED, d,
      `require_vector_vs;\nauto acc = P.VU.elt(rs1, 0);\nfor (reg_t i = 0; i < P.VU.vl; ++i) acc = ${RED_EXPR[mn]};\nP.VU.elt(rd, 0, true) = acc;\nP.VU.vstart = 0;`);
  }

  /* ================= mask ops ================= */
  const MASK = [["vmand","011001","Mask AND."],["vmnand","011101","Mask NAND."],["vmandn","011000","Mask AND-not."],
    ["vmxor","011011","Mask XOR."],["vmor","011010","Mask OR."],["vmnor","011110","Mask NOR."],
    ["vmorn","011100","Mask OR-not."],["vmxnor","011111","Mask XNOR."]];
  for(const [mn,f6,d] of MASK) vop(mn+".mm", `${mn}.mm vd, vs2, vs1`, f6, "010", G.MASK, d,
    `require_vector_vs;\nVI_MM_LOOP { vd = ${MASK_EXPR[mn]}; }`);
  const MUN = {"00001":["vmsbf","Set mask bits before the first set bit."],"00010":["vmsof","Set only the first set bit."],
    "00011":["vmsif","Set mask bits including the first set bit."],"10000":["viota","Populate with indices of active elements."],
    "10001":["vid","Populate with the element index (identity)."]};
  const MUN_EXPR = {vmsbf:"mask_before_first(vs2)", vmsof:"only_first_set(vs2)", vmsif:"mask_through_first(vs2)", viota:"iota_count(vs2)", vid:"i"};
  for(const [vs1,[mn,d]] of Object.entries(MUN)) vop(mn+".m", `${mn}.m vd, vs2, vm`, "010100", "010", G.MASK, d, `require_vector_vs;\nVI_MM_LOOP { vd = ${MUN_EXPR[mn]}; }`, {vs1});
  vop("vcpop.m","vcpop.m rd, vs2, vm","010000","010",G.MASK,"Count set bits of the mask into integer rd.",
    "require_vector_vs;\nreg_t cnt = 0;\nfor (reg_t i = 0; i < P.VU.vl; ++i) cnt += P.VU.elt<uint8_t>(rs2, i) & 1;\nWRITE_RD(cnt);", {vs1:"10000"});
  vop("vfirst.m","vfirst.m rd, vs2, vm","010000","010",G.MASK,"Return the index of the first set mask bit (or vl).",
    "require_vector_vs;\nreg_t i = 0;\nwhile (i < P.VU.vl && !(P.VU.elt<uint8_t>(rs2, i) & 1)) ++i;\nWRITE_RD(i);", {vs1:"10001"});

  /* ================= permutation / move ================= */
  vop("vcompress.vm","vcompress.vm vd, vs2, vs1","010111","010",G.PERM,"Compress active elements of vs2 into vd.",
    "require_vector_vs;\nreg_t j = 0;\nfor (reg_t i = 0; i < P.VU.vl; ++i)\n  if (P.VU.elt<uint8_t>(rs1, i) & 1) P.VU.elt(rd, j++, true) = P.VU.elt(rs2, i);\nP.VU.vstart = 0;");
  vop("vmv.v.v","vmv.v.v vd, vs1","010111","000",G.PERM,"Copy vector vs1 to vd.", "require_vector_vs;\nVI_VV_LOOP { vd = vs1; }", {vm:"1"});
  vop("vmv.v.x","vmv.v.x vd, rs1","010111","100",G.PERM,"Splat scalar rs1 into vd.", "require_vector_vs;\nVI_VX_LOOP { vd = RS1; }", {vm:"1"});
  vop("vmv.v.i","vmv.v.i vd, imm","010111","011",G.PERM,"Splat immediate into vd.", "require_vector_vs;\nVI_VI_LOOP { vd = insn.v_i_imm(); }", {vm:"1"});
  vop("vmv.x.s","vmv.x.s rd, vs2","010000","010",G.PERM,"Move element 0 of vs2 to scalar rd.", "require_vector_vs;\nWRITE_RD(P.VU.elt(rs2, 0));", {vs1:"00000"});
  vop("vmv.s.x","vmv.s.x vd, rs1","010000","110",G.PERM,"Move scalar rs1 to element 0 of vd.", "require_vector_vs;\nP.VU.elt(rd, 0, true) = RS1;\nP.VU.vstart = 0;", {vs2:"00000"});
  const NREG = {1:"00000",2:"00001",4:"00011",8:"00111"};
  for(const n of [1,2,4,8]) vop("vmv"+n+"r.v","vmv"+n+"r.v vd, vs2","100111","011",G.PERM,`Copy ${n} whole vector register(s).`, `require_vector_vs;\nfor (reg_t i = 0; i < ${n}; ++i)\n  P.VU.elt(rd + i, 0, true) = P.VU.elt(rs2 + i, 0);\nP.VU.vstart = 0;`, {vs1:NREG[n]});

  /* ================= vector FP ================= */
  const FPV = [
    ["vfadd","000000","vv vf","FP add."],["vfsub","000010","vv vf","FP subtract."],
    ["vfmin","000100","vv vf","FP minimum."],["vfmax","000110","vv vf","FP maximum."],
    ["vfsgnj","001000","vv vf","FP sign injection."],["vfsgnjn","001001","vv vf","FP sign injection (negated)."],
    ["vfsgnjx","001010","vv vf","FP sign injection (XOR)."],["vfdiv","100000","vv vf","FP divide."],
    ["vfrdiv","100001","vf","FP reverse divide (scalar/vector)."],["vfmul","100100","vv vf","FP multiply."],
    ["vfrsub","100111","vf","FP reverse subtract."],["vfmadd","101000","vv vf","FP fused multiply-add."],
    ["vfnmadd","101001","vv vf","FP fused negate-multiply-add."],["vfmsub","101010","vv vf","FP fused multiply-subtract."],
    ["vfnmsub","101011","vv vf","FP fused negate-multiply-subtract."],["vfmacc","101100","vv vf","FP fused multiply-accumulate."],
    ["vfnmacc","101101","vv vf","FP fused negate-multiply-accumulate."],["vfmsac","101110","vv vf","FP fused multiply-subtract-accumulate."],
    ["vfnmsac","101111","vv vf","FP fused negate-multiply-subtract-accumulate."],
    ["vfwmul","111000","vv vf","FP widening multiply."],["vfwmacc","111100","vv vf","FP widening multiply-accumulate."],
    ["vfwnmacc","111101","vv vf","FP widening negate-multiply-accumulate."],["vfwmsac","111110","vv vf","FP widening multiply-subtract-accumulate."],
    ["vfwnmsac","111111","vv vf","FP widening negate-multiply-subtract-accumulate."],
    ["vfwadd","110000","vv vf","FP widening add."],["vfwsub","110010","vv vf","FP widening subtract."],
    ["vfwadd.w","110100","vv vf","FP widening add (first operand single-width)."],
    ["vfwsub.w","110110","vv vf","FP widening subtract (first operand single-width)."],
    ["vfredusum","000001","vs","FP unordered sum reduction."],["vfredosum","000011","vs","FP ordered sum reduction."],
    ["vfredmin","000101","vs","FP minimum reduction."],["vfredmax","000111","vs","FP maximum reduction."],
    ["vfwredusum","110001","vs","FP widening unordered sum reduction."],["vfwredosum","110011","vs","FP widening ordered sum reduction."],
  ];
  for(const [mn,f6,forms,d] of FPV){
    for(const f of forms.split(" ")){
      const operand = f==="vf" ? "f[rs1]" : "vs1";
      vop(mn+"."+f, `${mn}.${f} vd, vs2, ${operand}, vm`, f6, F3F[f], G.FP, d, f==="vs" ? `require_vector_vs;\nauto acc = P.VU.elt(rs1, 0);\nfor (reg_t i = 0; i < P.VU.vl; ++i) acc = ${SAIL[mn].vs};\nP.VU.elt(rd, 0, true) = acc;\nP.VU.vstart = 0;` : vsail(mn,f));
    }
  }
  const FPCMP = [["vmfeq","011000"],["vmfne","011100"],["vmflt","011011"],["vmfle","011001"],["vmfgt","011101"],["vmfge","011111"]];
  for(const [mn,f6] of FPCMP){
    vop(mn+".vv", `${mn}.vv vd, vs2, vs1, vm`, f6, "001", G.CMP, "FP compare → mask.", vsail(mn,"vv"));
    vop(mn+".vf", `${mn}.vf vd, vs2, f[rs1], vm`, f6, "101", G.CMP, "FP compare vs scalar → mask.", vsail(mn,"vf"));
  }
  const FCVT = {
    "00000":"vfcvt.xu.f.v","00001":"vfcvt.x.f.v","00010":"vfcvt.f.xu.v","00011":"vfcvt.f.x.v",
    "00110":"vfcvt.rtz.xu.f.v","00111":"vfcvt.rtz.x.f.v",
    "01000":"vfwcvt.xu.f.v","01001":"vfwcvt.x.f.v","01010":"vfwcvt.f.xu.v","01011":"vfwcvt.f.x.v","01100":"vfwcvt.f.f.v",
    "01110":"vfwcvt.rtz.xu.f.v","01111":"vfwcvt.rtz.x.f.v",
    "10000":"vfncvt.xu.f.w","10001":"vfncvt.x.f.w","10010":"vfncvt.f.xu.w","10011":"vfncvt.f.x.w","10100":"vfncvt.f.f.w",
    "10101":"vfncvt.rod.f.f.w","10110":"vfncvt.rtz.xu.f.w","10111":"vfncvt.rtz.x.f.w"};
  const FCVT_EXPR = {
    "vfcvt.xu.f.v":"cvt_float_to_uint(vs2)","vfcvt.x.f.v":"cvt_float_to_int(vs2)",
    "vfcvt.f.xu.v":"cvt_uint_to_float(vs2)","vfcvt.f.x.v":"cvt_int_to_float(vs2)",
    "vfcvt.rtz.xu.f.v":"cvt_float_to_uint_rtz(vs2)","vfcvt.rtz.x.f.v":"cvt_float_to_int_rtz(vs2)",
    "vfwcvt.xu.f.v":"wcvt_float_to_uint(vs2)","vfwcvt.x.f.v":"wcvt_float_to_int(vs2)",
    "vfwcvt.f.xu.v":"wcvt_uint_to_float(vs2)","vfwcvt.f.x.v":"wcvt_int_to_float(vs2)",
    "vfwcvt.f.f.v":"wcvt_float_to_float(vs2)","vfwcvt.rtz.xu.f.v":"wcvt_float_to_uint_rtz(vs2)",
    "vfwcvt.rtz.x.f.v":"wcvt_float_to_int_rtz(vs2)",
    "vfncvt.xu.f.w":"ncvt_float_to_uint(vs2)","vfncvt.x.f.w":"ncvt_float_to_int(vs2)",
    "vfncvt.f.xu.w":"ncvt_uint_to_float(vs2)","vfncvt.f.x.w":"ncvt_int_to_float(vs2)",
    "vfncvt.f.f.w":"ncvt_float_to_float(vs2)","vfncvt.rod.f.f.w":"ncvt_float_to_float_rod(vs2)",
    "vfncvt.rtz.xu.f.w":"ncvt_float_to_uint_rtz(vs2)","vfncvt.rtz.x.f.w":"ncvt_float_to_int_rtz(vs2)",
  };
  for(const [vs1,mn] of Object.entries(FCVT)){
    vop(mn, `${mn} vd, vs2, vm`, "010010", "001", G.CVT, "FP/integer element-wise conversion.", `require_vector_vs;\nVI_VV_LOOP { vd = ${FCVT_EXPR[mn]}; }`, {vs1});
  }
  const UNARY_EXPR = {"vfsqrt.v":"fsqrt(vs2)","vfrsqrt7.v":"frsqrt7(vs2)","vfrec7.v":"frec7(vs2)","vfclass.v":"fclass(vs2)"};
  for(const [vs1,[mn,d]] of [["00000",["vfsqrt.v","Vector FP square root."]],["00100",["vfrsqrt7.v","Vector reciprocal sqrt estimate (7 bits)."]],["00101",["vfrec7.v","Vector reciprocal estimate (7 bits)."]],["10000",["vfclass.v","Vector FP classify (10-bit class per element)."]]]){
    vop(mn, `${mn} vd, vs2, vm`, "010011", "001", G.CVT, d, `require_vector_vs;\nVI_VV_LOOP { vd = ${UNARY_EXPR[mn]}; }`, {vs1});
  }
  vop("vfmv.f.s","vfmv.f.s rd, vs2","010000","001",G.FP,"Extract element 0 of vs2 to f[rd].", "require_fp;\nrequire_vector_vs;\nWRITE_FRD(P.VU.elt(rs2, 0));", {vs1:"00000"});
  vop("vfmv.s.f","vfmv.s.f vd, f[rs1]","010000","101",G.FP,"Move f[rs1] to element 0 of vd.", "require_fp;\nrequire_vector_vs;\nP.VU.elt(rd, 0, true) = FRS1;\nP.VU.vstart = 0;", {vs2:"00000"});
  vop("vfmerge.vfm","vfmerge.vfm vd, vs2, f[rs1], v0","010111","101",G.PERM,"FP merge with scalar (mask v0).", "require_fp;\nrequire_vector_vs;\nVI_VF_LOOP { vd = v0[i] ? FRS1 : vs2; }", {vm:"0"});

  /* ================= integer unary (extension) ================= */
  const IXUN = {"00010":["vzext.vf8","Zero-extend 8→SEW."],"00011":["vsext.vf8","Sign-extend 8→SEW."],
    "00100":["vzext.vf4","Zero-extend 16→SEW."],"00101":["vsext.vf4","Sign-extend 16→SEW."],
    "00110":["vzext.vf2","Zero-extend 32→SEW."],"00111":["vsext.vf2","Sign-extend 32→SEW."]};
  for(const [vs1,[mn,d]] of Object.entries(IXUN)){
    const factor = mn.endsWith("vf8") ? "SEW/8" : mn.endsWith("vf4") ? "SEW/4" : "SEW/2";
    const zs = mn.startsWith("vzext");
    vop(mn, `${mn} vd, vs2, vm`, "010010", "010", G.ARITH, d, `require_vector_vs;\nVI_VV_LOOP { vd = ${zs?"zext":"sext"}(vs2, ${factor}); }`, {vs1});
  }

  /* ================= crypto (Zvbb/Zvbc/Zvkg representative) ================= */
  vop("vandn.vv","vandn.vv vd, vs2, vs1, vm","000001","000",G.CRYPTO,"Bitwise AND with inverted first operand (SHA3 Chi).",
    "require_vector_vs;\nVI_VV_LOOP { vd = ~vs1 & vs2; }");
  vop("vandn.vx","vandn.vx vd, vs2, rs1, vm","000001","100",G.CRYPTO,"Bitwise AND with inverted scalar.",
    "require_vector_vs;\nVI_VX_LOOP { vd = ~RS1 & vs2; }");
  vop("vbrev.v","vbrev.v vd, vs2, vm","010010","010",G.CRYPTO,"Reverse the bits of each element.", "require_vector_vs;\nVI_VV_LOOP { vd = bitreverse(vs2); }", {vs1:"01010"});
  vop("vbrev8.v","vbrev8.v vd, vs2, vm","010010","010",G.CRYPTO,"Reverse bits within each byte.", "require_vector_vs;\nVI_VV_LOOP { vd = bitreverse8(vs2); }", {vs1:"01000"});
  vop("vclz.v","vclz.v vd, vs2, vm","010010","010",G.CRYPTO,"Count leading zeros per element.", "require_vector_vs;\nVI_VV_LOOP { vd = clz(vs2); }", {vs1:"01100"});
  vop("vctz.v","vctz.v vd, vs2, vm","010010","010",G.CRYPTO,"Count trailing zeros per element.", "require_vector_vs;\nVI_VV_LOOP { vd = ctz(vs2); }", {vs1:"01101"});
  vop("vcpop.v","vcpop.v vd, vs2, vm","010010","010",G.CRYPTO,"Population count per element.", "require_vector_vs;\nVI_VV_LOOP { vd = popcount(vs2); }", {vs1:"01110"});
  vop("vclmul.vv","vclmul.vv vd, vs2, vs1, vm","001100","010",G.CRYPTO,"Carry-less multiply (low half).",
    "require_vector_vs;\nVI_VV_LOOP { vd = clmul(vs2, vs1); }");
  vop("vclmulh.vv","vclmulh.vv vd, vs2, vs1, vm","001101","010",G.CRYPTO,"Carry-less multiply (high half).",
    "require_vector_vs;\nVI_VV_LOOP { vd = clmulh(vs2, vs1); }");

  // attach element/bit-width behavior diagrams
  const DMAP = {
    "vadd.vv":"vadd", "vwadd.vv":"vwadd", "vnsrl.wi":"vnsrl",
    "vle8.v":"vle8", "vse16.v":"vse16", "vlse32.v":"vlse32", "vluxei16.v":"vluxei16",
    "vfmacc.vv":"vfmacc", "vredsum.vs":"vredsum",
  };
  V.forEach(v => { if(DMAP[v.name]) v.diagram = DMAP[v.name]; });

  window.RISCV.VECTOR = V;
  window.RISCV.INSTRUCTIONS = (window.RISCV.INSTRUCTIONS || []).concat(V);
})();
