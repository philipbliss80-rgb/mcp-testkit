# mcp-testkit

The testing framework for [MCP](https://modelcontextprotocol.io) (Model Context Protocol) servers.

Write declarative tests in YAML, run them against any MCP server, get clear pass/fail output. Works in CI out of the box.

```bash
npx mcp-testkit run mcp-tests.yaml
```

---

## Why

Every team building an MCP server tests it the same way: open Claude Desktop, call the tool manually, see what breaks, fix it, repeat. That works for one tool. It breaks when you have twenty, or when you need CI to catch regressions before they ship.

mcp-testkit is the missing piece. One YAML file describes your tests. One command runs them.

---

## Install

```bash
npm install --save-dev mcp-testkit
```

Or run without installing:

```bash
npx mcp-testkit init
```

**Requires Node 18+.**

---

## Quick start

**1. Generate a starter file**

```bash
npx mcp-testkit init
```

This writes `mcp-tests.yaml` in the current directory.

**2. Edit it**

```yaml
version: 1

server:
  transport: stdio
  command: node
  args: ["./your-server.js"]

tests:
  - name: Echo returns the message
    tool: echo
    input:
      message: hello
    expect:
      output: hello

  - name: Response contains a result field
    tool: add
    input:
      a: 2
      b: 3
    expect:
      contains:
        result: 5

  - name: Bad input returns an error
    tool: add
    input:
      a: "not a number"
      b: 1
    expect:
      error: true
```

**3. Run**

```bash
npx mcp-testkit run mcp-tests.yaml
```

Output:
