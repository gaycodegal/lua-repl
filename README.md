# Wasm Term

Implements a fake readline and 'eprintf' which is just printf but it prints to web or terminal depending on environment.

Try it live at: gaycodegal.github.io/wasm-term/html

## Compiling

Before switching between native build and emscripten, you have to run

```
make clean
```

### WASM

```
emmake make wasm
```

### Native
```
make
```

