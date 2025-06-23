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

import { Database } from "bun:sqlite";
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const HTML5LIB_DIR = join(import.meta.dir, "html5lib-tests");
const TOKENIZER_TESTS_DIR = join(HTML5LIB_DIR, "tokenizer");

// Extension based on platform
const EXT =
  process.platform === "win32"
    ? ".dll"
    : process.platform === "darwin"
      ? ".dylib"
      : ".so";

// Set custom SQLite path if on macOS and env var is set
// if (process.platform === "darwin" && process.env.SQLITE_LIB_PATH)
//   Database.setCustomSQLite(process.env.SQLITE_LIB_PATH);

// Our tokenizer implementation
class HtmlTokenizer {
  private db: Database;

  constructor() {
    this.db = new Database(":memory:");
    this.db.loadExtension(`./dist/fts5${EXT}`);
    this.db.loadExtension(`./dist/fts5-html${EXT}`);

    // Create a test table with our HTML tokenizer
    this.db
      .query(
        `CREATE VIRTUAL TABLE test_html USING fts5(content, tokenize = 'html unicode61')`,
      )
      .run();
    // Create a test table with our HTML tokenizer
    this.db
      .query(
        `CREATE VIRTUAL TABLE test_html_vocab USING fts5vocab(test_html, 'instance')`,
      )
      .run();
  }

  // Tokenize HTML content and return the tokens
  tokenize(html: string): string[] {
    // Insert the HTML content into our FTS5 table
    this.db.query(`INSERT INTO test_html VALUES(?)`).run(html);

    // Use SQLite's built-in function to get the tokens
    const tokens = this.db
      .query(
        `
      SELECT term
      FROM test_html_vocab
    `,
      )
      .all() as { term: string }[];

    // Clear the table for next test
    this.db.query(`DELETE FROM test_html`).run();

    return tokens.map((t) => t.term);
  }

  close() {
    this.db.close();
  }
}

// Load and parse HTML5Lib test cases
async function loadHtml5LibTests(testFile: string): Promise<any> {
  const filePath = join(TOKENIZER_TESTS_DIR, testFile);
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content);
}

describe("HTML5Lib Tokenizer Tests", () => {
  let tokenizer = new HtmlTokenizer();

  afterAll(() => {
    tokenizer.close();
  });

  test("Basic HTML tokenization", () => {
    const html = "<p>Hello <b>World</b></p>";
    const tokens = tokenizer.tokenize(html);

    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
  });

  // Run selected HTML5Lib tests
  describe("HTML5Lib Test Suite", async () => {
    // Get all JSON test files from the HTML5Lib tokenizer tests directory
    const files = await readdir(TOKENIZER_TESTS_DIR);
    const testFiles = files.filter((file) => file.endsWith(".test"));

    if (testFiles.length === 0) {
      throw new Error(
        "No HTML5Lib test files found. Make sure the HTML5Lib repo is cloned to tests/html5lib",
      );
    } else {
      console.log(`Found ${testFiles.length} HTML5Lib tokenizer test files`);
    }

    for (const testFile of testFiles) {
      const testData = await loadHtml5LibTests(testFile);
      if (!testData?.tests) {
        console.warn(`No tests found in: ${testFile}`);
        continue;
      }

      describe(testFile, async () => {
        for (const testCase of testData.tests) {
          if (!testCase.input) continue;
          test(testCase.description, () => {
            // Tokenize the input HTML
            const tokens = tokenizer.tokenize(testCase.input);

            // For HTML5Lib test cases, we're primarily checking that parsing completes
            // without errors. The specific output tokens will differ from the HTML5Lib
            // expected output since our tokenizer is designed for FTS indexing
            expect(tokens).toBeDefined();
          });
        }
      });
    }
  });

  // Custom test cases that specifically test our tokenizer's behavior
  describe("Custom HTML Test Cases", () => {
    const testCases = [
      {
        name: "Entity decoding",
        html: "Text with &amp; &lt; &gt; &quot; &apos; entities",
        expectedTokens: ["text", "with", "entities"],
      },
      {
        name: "Script and style content exclusion",
        html: "<p>Visible text</p><script>var x = 'invisible';</script><style>body { display: none }</style>",
        expectedTokens: ["visible", "text"],
        unexpectedTokens: ["var", "invisible", "body", "display", "none"],
      },
      {
        name: "HTML comments",
        html: "<p>Text</p><!-- Comment should be ignored --><p>More text</p>",
        expectedTokens: ["text", "more", "text"],
        unexpectedTokens: ["comment", "should", "be", "ignored"],
      },
      {
        name: "Numeric entities",
        html: "&#65;&#66;&#67; and &#x41;&#x42;&#x43;",
        expectedTokens: ["abc", "and", "abc"],
      },
    ];

    for (const testCase of testCases) {
      test(testCase.name, () => {
        const tokens = tokenizer.tokenize(testCase.html);

        if (testCase.expectedTokens) {
          for (const expected of testCase.expectedTokens) {
            expect(tokens).toContain(expected);
          }
        }

        if (testCase.unexpectedTokens) {
          for (const unexpected of testCase.unexpectedTokens) {
            expect(tokens).not.toContain(unexpected);
          }
        }
      });
    }
  });
});
