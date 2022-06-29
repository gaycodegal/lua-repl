extern "C" {
#include "term.h"
};

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/bind.h>
#endif

#ifdef __EMSCRIPTEN__
char *rl_readline_name;

void add_history(const char *item) {

}

#endif
int eprintf(const char *format, ...) {
  va_list args;
  va_start(args, format);
  size_t size = vsnprintf(NULL, 0, format, args);
  va_end(args);
#ifdef __EMSCRIPTEN__
  char *output = (char *)malloc(size + 1);
  vsprintf(output, format, args);
  EM_ASM({ print(UTF8ToString($0)); }, output);

  free(output);
#else
  va_start(args, format);
  vprintf(format, args);
  va_end(args);
#endif

  return size;
}

#ifdef __EMSCRIPTEN__
EM_ASYNC_JS(char *, readline_js, (), {
  const response = await readline_from_input();
  const byteCount = (Module.lengthBytesUTF8(response) + 1);

  const linePointer = Module._malloc(byteCount);
  Module.stringToUTF8(response, linePointer, byteCount);

  return linePointer;
});

char *readline(const char *prompt) {
  eprintf("%s", prompt);
  return readline_js();
}

#endif

#ifdef __EMSCRIPTEN__
#include <string>
#include <vector>
int main(int argc, const char **argv);
int wrap_main(const std::vector<std::string> &args) {
  const char **argv;
  argv = new const char *[args.size() + 1];
  for (int i = 0; i < args.size(); i++) {
    argv[i] = args[i].c_str();  // Copy the vector to the string
  }
  argv[args.size()] = NULL;

  return main((int)args.size(), argv);
}

EMSCRIPTEN_BINDINGS(my_module) {
  emscripten::register_vector<std::string>("StringList");

  emscripten::function("main", &wrap_main);
}
#endif
