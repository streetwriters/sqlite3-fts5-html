# HTML Tokenizer for SQLite3 FTS5

This is a pseudo tokenizer that can be used with SQLite3's FTS5
extension to index HTML documents. It understands just enough HTML to
extract the text from the document and ignore the markup.

This is a direct fork of https://github.com/gyf304/sqlite3-fts5-html without almost no modifications. All credit goes to the original author.

## Getting started

### Prerequisites

- Lemon
- Tcl

### Build

First install the prerequisites:

```sh
# on macOS
brew install lemon tcl-tk
# on Ubuntu Linux
sudo apt install lemon tcl
```

Then build the tokenizer:

```sh
make loadable
```

### Usage

Load the `fts5-html.so` or `fts5-html.dylib` file as a loadable SQLite extension (e.g. `.load fts5-html.so`).

Then specify it when creating your FTS5 virtual table:

```sql
CREATE VIRTUAL TABLE t1 USING fts5(
  content,
  -- html itself is not a tokenizer
  -- it must be must be used with another tokenizer
  tokenize = 'html unicode61 remove_diacritics 1'
)
```

## Contributing

All kinds of PRs are welcome, of course. Just make sure all the tests pass. You can run the tests like this:

```sh
make test
```

## License

```
2024-10-21

The author disclaims copyright to this source code.  In place of
a legal notice, here is a blessing:

    May you do good and not evil.
    May you find forgiveness for yourself and forgive others.
    May you share freely, never taking more than you give.
```
