
#include lua-5.4.4/src/Makefile



ifneq (,$(findstring wasm,$(MAKECMDGOALS)))
CC=emcc
endif


LUA_DIR=./lua-5.4.4/src/
IO_CC=../term/io.cc
IO_O=../term/io.o
SYSINC=-I../../../term -I../../../fake-headers
INC=-I../term -I../fake-headers
SYSCFLAGS=-DLUA_USE_LINUX -DLUA_USE_READLINE -include 'term.h' -include 'lua-fixer.h' 
SYSLIBS=-Wl,-E -ldl -lm
LUA_EXTRA=SYSCFLAGS="$(SYSCFLAGS) $(SYSINC)" SYSLIBS="$(SYSLIBS)" CC="$(CC) -std=gnu99" RANLIB="emranlib" AR="emar rcu"
#__wasm_CORE_O=$(addprefix $(LUA_DIR),$(CORE_O))
EMFLAGS=-lembind -sALLOW_MEMORY_GROWTH=1 -sASYNCIFY -sINVOKE_RUN=0 -s EXPORTED_RUNTIME_METHODS="['lengthBytesUTF8', 'stringToUTF8']"

wasm: $(IO_O)
	make -C $(LUA_DIR) a $(LUA_EXTRA)
	make -C $(LUA_DIR) lua.o $(LUA_EXTRA)
	$(CC) $(SYSCFLAGS) $(INC) $(SYSLIBS) $(IO_O) $(LUA_DIR)liblua.a $(LUA_DIR)lua.o -o ../html/lua.js $(EMFLAGS)
clean:
	make -C $(LUA_DIR) clean
