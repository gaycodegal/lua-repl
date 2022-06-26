#ifndef TERM__WASM_TERM_LIB
#define TERM__WASM_TERM_LIB
#include <stdarg.h>
#include <stdio.h>

#ifdef __EMSCRIPTEN__
#include <stdlib.h>
#include <emscripten.h>

#endif

void eprintf(const char *format, ...) {
    va_list args;
    va_start(args, format);

#ifdef __EMSCRIPTEN__
    size_t size = vsnprintf(NULL, 0, format, args);
    char *output = (char *)malloc(size + 1);
    vsprintf(output, format, args);
    EM_ASM({
	console.log('I received: ' + UTF8ToString($0));
      }, output);
    
    free(output);
#else
    vprintf(format, args);
#endif

    va_end(args);
}

#endif
