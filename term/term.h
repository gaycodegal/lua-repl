#ifndef TERM__WASM_TERM_LIB
#define TERM__WASM_TERM_LIB
#include <stdarg.h>
#include <stdio.h>

#ifdef __EMSCRIPTEN__
#include <stdlib.h>

#endif

int example();
void eprintf(const char *format, ...);

#endif
