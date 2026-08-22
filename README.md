# RISC-V Instruction Set Reference

A static, self-contained HTML reference for the RISC-V ISA — an ARM ISA-XML-style
browser: per-instruction 32-bit encoding grid, assembly syntax, and a Spike
(riscv-isa-sim) golden-model pseudocode with a recursive, clickable helper glossary.

## Pages
- **Overview** — reference specification + extension coverage.
- **Instruction Summary** — alphabetical list with mnemonic + behavior.
- **Encoding Space** — recursive bit-decode tree (opcode → funct3/funct7/… → instruction).
- **System Registers** — CSR listing by privilege.
- **Protection Domains** — privilege levels, CSR address space, PMP, paging.

## Run
Any static file server works (no build step):

```sh
python3 -m http.server 8090
# open http://127.0.0.1:8090/
```

Routing is hash-based (`#/enc`, `#/inst/FMADD.S`), so it works from any base path,
including a GitHub Pages sub-path (e.g. `user.github.io/rsicv/`).

## Reference
RISC-V Instruction Set Manual, Volume I (Unprivileged, Version 20250508) and
Volume II (Privileged). Golden models follow Spike + Berkeley SoftFloat.
