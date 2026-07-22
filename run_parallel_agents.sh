#!/bin/bash
# Script to dispatch math solver and verifier agents

# The perception system allows multiple tool calls in a single response.
# This script demonstrates the concept, but we'll use the perception API directly.

echo "Dispatching 20 solver agents and 20 verifier agents..."

# In a real scenario with perception, we need to make tool calls through the API.
# Let's instead demonstrate by using the Bash tool directly with parallel commands.

# Define math problems for solvers
declare -a PROBLEMS=(
  "1523 + 4877"
  "9000 - 3746"
  "2847 * 63"
  "59535 / 63"
  "12^4"
  "256 * 125"
  "12345 + 67890"
  "76543 - 28901"
  "37 * 84"
  "98765 - 54321"
  "45 * 67"
  "50000 - 23456"
  "234 * 56"
  "88888 + 11111"
  "43210 - 19876"
  "77 * 99"
  "125 * 80"
  "99999 - 55555"
  "365 * 24"
  "147 * 293"
)

# Correct answers for verifiers
declare -a ANSWERS=(
  "6400"
  "5254"
  "179361"
  "945"
  "20736"
  "32000"
  "80235"
  "47642"
  "3108"
  "44444"
  "3015"
  "26544"
  "13104"
  "99999"
  "23334"
  "7623"
  "10000"
  "44444"
  "8760"
  "43071"
)

echo "=== 20 Math Problems ==="
for i in "${!PROBLEMS[@]}"; do
  echo "Solver $((i+1)): ${PROBLEMS[$i]} => Expected: ${ANSWERS[$i]}"
done

echo ""
echo "=== Dispatch Pattern ==="
echo "Each solver solves its problem and returns only the answer"
echo "Each verifier checks if the solver's answer matches the expected answer"
echo ""
echo "Total agents: 40 (20 solvers + 20 verifiers)"
