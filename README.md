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

## Use of readline

readline is a GPL licensed code, meaning if you link against it, you have to distribute your source code. You may want to try https://github.com/arangodb/linenoise-ng instead, which is compatible with closed or open source projects via disclaimer.

This library doesn't use readline's source code to do input on the web, it just uses a simple `<input>` element, as this was the most accessible way I could think of to do line-editing functionality.
