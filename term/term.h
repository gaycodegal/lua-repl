#ifndef TERM__WASM_TERM_LIB
#define TERM__WASM_TERM_LIB
#include <stdarg.h>
#include <stdio.h>

#ifdef __EMSCRIPTEN__
#include <stdlib.h>

char *readline(const char *prompt);
#else
#include <readline/history.h>
#include <readline/readline.h>
#endif

void eprintf(const char *format, ...);

#endif
