EXT = .so
SQLITE_VERSION ?= version-3.49.1

SQLITE_TARBALL_URL = https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=${SQLITE_VERSION}
SQLITE_SRC = deps/$(SQLITE_VERSION)/src
SQLITE_AMALGAMATION_URL = https://sqlite.org/2025/sqlite-amalgamation-3490100.zip
SQLITE_AMALGAMATION_PATH = deps/sqlite-amalgamation-3490100

override CFLAGS += -Ideps/$(SQLITE_VERSION)/ext/fts5 -I$(SQLITE_AMALGAMATION_PATH) -Ideps/lexbor/source -Ldeps/lexbor/build -Os -Wall -Wextra -llexbor_static
CONDITIONAL_CFLAGS = -lm

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	EXT = .dylib
endif

.PHONY: all clean test

prefix=dist
$(prefix):
	mkdir -p $(prefix)

TARGET_LOADABLE=$(prefix)/fts5-html$(EXT)
TARGET_FTS5=$(prefix)/fts5$(EXT)
TARGET_LIBSQLITE=$(prefix)/libsqlite3$(EXT)

loadable: $(TARGET_LOADABLE)

clean:
	rm -rf deps
	rm -rf $(prefix)

$(SQLITE_SRC):
	mkdir -p deps/$(SQLITE_VERSION)
	curl -LsS $(SQLITE_TARBALL_URL) | tar -xzf - -C deps/$(SQLITE_VERSION)/ --strip-components=1

$(SQLITE_AMALGAMATION_PATH):
	@echo Downloading SQLite amalgamation...
	wget -q $(SQLITE_AMALGAMATION_URL) -O sqlite.zip
	@echo Extracting SQLite amalgamation...
	unzip sqlite.zip -d deps/
	rm -f sqlite.zip

$(TARGET_LOADABLE): $(SQLITE_SRC) $(SQLITE_AMALGAMATION_PATH) $(prefix)
	$(CC) $(CFLAGS) $(CONDITIONAL_CFLAGS) -shared -fPIC -o $@ fts5-html.c

$(TARGET_FTS5): $(SQLITE_SRC) $(SQLITE_AMALGAMATION_PATH) $(prefix)
	dir=deps/$(SQLITE_VERSION) \
	cwd=$$(pwd); \
	lemon $$dir/ext/fts5/fts5parse.y; \
	cd $$dir/ext/fts5; \
	tclsh $$cwd/$$dir/ext/fts5/tool/mkfts5c.tcl; \
	cd $$cwd; \
	$(CC) $(CFLAGS) $(CONDITIONAL_CFLAGS) -DSQLITE_TEST -shared -fPIC -o $@ $$dir/ext/fts5/fts5.c; \

$(TARGET_LIBSQLITE): $(SQLITE_AMALGAMATION_PATH) $(prefix)
	$(CC) $(CFLAGS) $(CONDITIONAL_CFLAGS) -shared -fPIC -o $@ $(SQLITE_AMALGAMATION_PATH)/sqlite3.c

test: $(TARGET_LIBSQLITE) $(TARGET_FTS5) $(TARGET_LOADABLE)
	SQLITE_LIB_PATH=$(TARGET_LIBSQLITE) bun test
