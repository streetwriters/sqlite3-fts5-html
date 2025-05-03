#ifndef SQLITE_FTS5_HTML_H
#define SQLITE_FTS5_HTML_H

#ifndef SQLITE_CORE
#include "sqlite3ext.h"
#else
#include "sqlite3.h"
#endif

#ifndef SQLITE_PRIVATE
#define SQLITE_PRIVATE static
#endif

#ifdef SQLITE_FTS5_HTML_STATIC
#define SQLITE_FTS5_HTML_API
#else
#ifdef _WIN32
#define SQLITE_FTS5_HTML_API __declspec(dllexport)
#else
#define SQLITE_FTS5_HTML_API
#endif
#endif

#ifdef __cplusplus
extern "C" {
#endif

#ifdef SQLITE_CORE
SQLITE_PRIVATE int sqlite3Fts5HtmlInit(sqlite3 *db);
#else
SQLITE_FTS5_HTML_API int
sqlite3_ftshtml_init(sqlite3 *db, char **pzErrMsg,
                           const sqlite3_api_routines *pApi);

#endif

#ifdef __cplusplus
} /* end of the 'extern "C"' block */
#endif

#endif /* ifndef SQLITE_FTS5_HTML_H */
