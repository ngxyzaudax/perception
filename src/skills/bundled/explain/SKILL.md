---
name: explain
description: Explain how a file, module, or subsystem works
allowed-tools: Read, Grep, Glob, LSP
---
Explain the following code area to the user: $ARGUMENTS

Steps:
1. Locate the relevant files with Glob and Grep.
2. Read the entry points and follow the important call paths.
3. Produce a concise explanation covering purpose, data flow, key functions, and how the pieces connect.
4. Mention notable edge cases or non-obvious behavior.

Keep the explanation grounded in the actual code you read. Cite file paths for every claim.
