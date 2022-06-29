#if !defined(lua_writestringerror)
#define lua_writestringerror(s,p) \
        (printf((s), (p)))
#endif

/* print a string */
#if !defined(lua_writestring)
#define lua_writestring(s,l)   printf("%s", s)
#endif

/* print a newline and flush the output */
#if !defined(lua_writeline)
#define lua_writeline()        (printf("\n"))
#endif
