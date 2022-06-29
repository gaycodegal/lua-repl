INC=-I./headers -I./term
SRC=./source
SRC_TERM=./term
OBJS_TERM=$(patsubst %.cc,%.o,$(wildcard $(SRC_TERM)/*.cc))
OBJS=$(patsubst %.c,%.o,$(wildcard $(SRC)/*.c)) $(OBJS_TERM)
CC=gcc
LINKER_FLAGS= 
OBJ_NAME=main
CFLAGS=
CPPFLAGS=

ifneq (,$(findstring wasm,$(MAKECMDGOALS)))
OBJ_NAME=html/term.js
CC=emcc
EMFLAGS=-lembind -sALLOW_MEMORY_GROWTH=1 -sASYNCIFY -sINVOKE_RUN=0 -s EXPORTED_RUNTIME_METHODS="['lengthBytesUTF8', 'stringToUTF8']"
INC +=-Ifake-headers
CFLAGS += -O2
CPPFLAGS += -O2
endif

CFLAGS += $(INC)
CPPFLAGS += $(INC)




all: $(OBJS)
	echo $(OBJS)
	$(CC) $(OBJS) $(CFLAGS) $(LINKER_FLAGS) -lreadline -o $(OBJ_NAME)
wasm: $(OBJS)
	$(CC) $(OBJS) $(CFLAGS)  $(EMFLAGS) $(LINKER_FLAGS) -o $(OBJ_NAME) #--preload-file resources/
clean:
	git clean -fX
re:
	make clean all
format:
	clang-format -i $(shell find source/ headers/ term/ -iname '*.[ch]')
	clang-format -i $(shell find source/ headers/ term/ -iname '*.[ch][ch]')
