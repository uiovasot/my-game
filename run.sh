#!/bin/bash

while true; do
  if command -v bun &> /dev/null; then
    bun start
  else
    tsx src/index.ts
  fi
  sleep 1
done