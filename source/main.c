#include "main.h"

#include <stdlib.h>

#include "term.h"

int main(int argc, const char **argv) {
  int are_we_good = example();
  eprintf("hello world %i.\n", are_we_good);
  return 0;
}
