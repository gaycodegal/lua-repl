
#include "term.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include <emscripten.h>
#endif

float lerp(float a, float b, float t) {
    return (1 - t) * a + t * b;
}


#ifdef __EMSCRIPTEN__
#include <vector>
#include <string>
int main(int argc, const char **argv);
int wrap_main(const std::vector<std::string> &args) {
  const char **argv;
  argv = new const char*[args.size() + 1];
  for(int i=0; i<args.size(); i++){
    argv[i] = args[i].c_str();//Copy the vector to the string
  }
  argv[args.size()] = NULL;
  

  return main((int)args.size(), argv);
}

EMSCRIPTEN_BINDINGS(my_module) {
  emscripten::register_vector<std::string>("StringList");

  emscripten::function("lerp", &lerp);
  emscripten::function("main", &wrap_main);
}  
#endif
