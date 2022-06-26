extern "C" {
#include "term.h"
};

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/bind.h>
#endif

void eprintf(const char *format, ...) {
  va_list args;
  va_start(args, format);

#ifdef __EMSCRIPTEN__
  size_t size = vsnprintf(NULL, 0, format, args);
  char *output = (char *)malloc(size + 1);
  vsprintf(output, format, args);
  EM_ASM({ print('I received: ' + UTF8ToString($0)); }, output);

  free(output);
#else
  vprintf(format, args);
#endif

  va_end(args);
}

#ifdef __EMSCRIPTEN__
EM_ASYNC_JS(int, do_fetch, (), {
  print("waiting for a fetch");
  const response = await fetch("index.html");
  print("got the fetch response");
  // (normally you would do something with the fetch here)
  return 42;
});

int example() { return do_fetch(); }

#else
extern "C" {
int example() { return 1337; }
};
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
