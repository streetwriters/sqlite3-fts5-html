/*
 ** 2024-10-21
 **
 ** The author disclaims copyright to this source code.  In place of
 ** a legal notice, here is a blessing:
 **
 **    May you do good and not evil.
 **    May you find forgiveness for yourself and forgive others.
 **    May you share freely, never taking more than you give.
 **
 */
// to run: bun test

import { Database } from "bun:sqlite";
import { test, describe, expect, afterAll, beforeAll } from "bun:test";

const EXT =
  process.platform === "win32"
    ? ".dll"
    : process.platform === "darwin"
      ? ".dylib"
      : ".so";

if (process.platform === "darwin" && process.env.SQLITE_LIB_PATH)
  Database.setCustomSQLite(process.env.SQLITE_LIB_PATH);

function initDatabase() {
  const db = new Database(":memory:");
  db.loadExtension(`./dist/fts5${EXT}`);
  db.loadExtension(`./dist/fts5-html${EXT}`);
  return db;
}

describe("unicode61", () => {
  const db = initDatabase();
  afterAll(() => db.close());

  test("1.0", () => {
    [
      `CREATE VIRTUAL TABLE test USING fts5(x, y, tokenize = 'html unicode61 remove_diacritics 1');`,
      `INSERT INTO test VALUES('a', '
      <html>
      <head>
	<script>ignored</script></head>
      <body>
	hello <style>also ignored</style> world &nbsp;&quot;asdf&quot;
	&#x61;&#x62;&#x63;&#x64;
	&#x4e2d;&#25991;
      </body>
      </html>
      ');`,
      `INSERT INTO test VALUES('b', '
      <!doctype html>
      <html>
      <head>
          <title>Example Domain</title>

          <meta charset="utf-8" />
          <meta http-equiv="Content-type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style type="text/css">
          body {
              background-color: #f0f0f2;
              margin: 0;
              padding: 0;
              font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;

          }
          div {
              width: 600px;
              margin: 5em auto;
              padding: 2em;
              background-color: #fdfdff;
              border-radius: 0.5em;
              box-shadow: 2px 3px 7px 2px rgba(0,0,0,0.02);
          }
          a:link, a:visited {
              color: #38488f;
              text-decoration: none;
          }
          @media (max-width: 700px) {
              div {
                  margin: 0 auto;
                  width: auto;
              }
          }
          </style>
      </head>

      <body>
      <div>
          <h1>Example Domain</h1>
          <p>This domain is for use in illustrative examples in documents. You may use this
          domain in literature without prior coordination or asking for permission.</p>
          <p><a href="https://www.iana.org/domains/example">More information...</a></p>
      </div>
      </body>
      </html>
      ');`,
    ].forEach((stmt) => db.query(stmt).run());
  });

  const queries = {
    ignored: 0,
    hello: 1,
    "hello world": 1,
    abcd: 1,
    中文: 1,
    example: 1,
    domain: 1,
    information: 1,
    quot: 0,
    nbsp: 0,
    meta: 0,
    margin: 0,
    viewport: 0,
    Helvetica: 0,
  };
  let i = 1;
  for (const query in queries) {
    sqlTest(
      db,
      `1.${i++}.${query}`,
      `SELECT count(*) as res FROM test WHERE test MATCH '${query}'`,
      [],
      [queries[query]],
    );
  }
});

describe("trigram", () => {
  const db = initDatabase();
  afterAll(() => db.close());

  test("1.0", () => {
    [
      `CREATE VIRTUAL TABLE test USING fts5(x, y, tokenize = 'html trigram remove_diacritics 1');`,
      `INSERT INTO test VALUES('a', '<p block-id="hello">This domain is for use in illustrative examples in documents. You may use this</p>');`,
    ].forEach((stmt) => db.query(stmt).run());
  });

  const queries = {
    hello: 0,
    domain: 1,
    use: 1,
  };
  let i = 1;
  for (const query in queries) {
    sqlTest(
      db,
      `1.${i++}.${query}`,
      `SELECT count(*) as res FROM test WHERE test MATCH '${query}'`,
      [],
      [queries[query]],
    );
  }
});

function sqlTest(
  db: Database,
  version: string,
  query: string,
  params: string[],
  expected: string | number | undefined | (string | number | undefined)[],
) {
  test(version, () => {
    const result = db.query(query).all(...params) as {
      res: string | number;
    }[];
    if (Array.isArray(expected)) {
      expect(Array.isArray(expected)).toBeTrue();
      expect(result.length).toBe(expected.length);
      result.forEach((result, i) => expect(result.res).toBe(expected[i]!));
    } else {
      expect(result[0]?.res).toBe(expected!);
    }
  });
}

function explainQueryPlanTest(
  db: Database,
  version: string,
  query: string,
  params: string[],
  expected: string,
) {
  test(version, () => {
    const result = db.query(`EXPLAIN QUERY PLAN ${query}`).get(...params) as {
      detail?: string;
    };
    expect(result?.detail).toInclude(expected);
  });
}
