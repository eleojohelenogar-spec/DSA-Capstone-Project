import { randomInt, randomUUID } from "node:crypto";

// No 0/O, 1/I/L so a clerk can read the code aloud without mix-ups.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REFERENCE_LENGTH = 8;

export function newId() {
  return randomUUID();
}

export function newReference() {
  const chars = [];
  for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
    chars.push(ALPHABET[randomInt(ALPHABET.length)]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}
