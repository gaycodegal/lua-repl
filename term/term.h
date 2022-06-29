#define printf eprintf

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

int eprintf(const char *format, ...);
void add_history(const char *item);
extern char *rl_readline_name;
#endif
