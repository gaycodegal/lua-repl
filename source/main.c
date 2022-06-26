#include "main.h"

#include <stdlib.h>
#include <string.h>

#include "term.h"

int main(int argc, const char **argv) {
  char *result = malloc(1);
  result[0] = '\0';
  while (result != NULL && strcmp(result, "stop") != 0) {
    if (result) {
      free(result);
    }
    result = readline("type something (stop to exit)\n");
    eprintf("you typed: '%s'\n", result);
  }
  return 0;
}
