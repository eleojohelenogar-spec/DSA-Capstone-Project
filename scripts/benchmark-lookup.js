import { performance } from "node:perf_hooks";
import {
  addTier,
  bookTickets,
  createEvent,
  createStore,
} from "../src/domain/inventory.js";

const BOOKING_COUNT = 20_000;
const LOOKUPS = 5_000;

const store = createStore();
const event = createEvent(store, { name: "Benchmark Festival" });
const tier = addTier(store, {
  eventId: event.id,
  name: "Standing",
  capacity: BOOKING_COUNT,
  priceCents: 1000,
});

const bookings = [];
for (let i = 0; i < BOOKING_COUNT; i += 1) {
  bookings.push(
    bookTickets(store, {
      eventId: event.id,
      tierId: tier.id,
      holderName: `Guest ${i + 1}`,
      quantity: 1,
    }),
  );
}

const target = bookings[Math.floor(BOOKING_COUNT / 2)].reference;
const byReference = store.bookingsByReference;
const asArray = bookings;

let mapHits = 0;
const mapStart = performance.now();
for (let i = 0; i < LOOKUPS; i += 1) {
  if (byReference.get(target)) {
    mapHits += 1;
  }
}
const mapMs = performance.now() - mapStart;

let arrayHits = 0;
const arrayStart = performance.now();
for (let i = 0; i < LOOKUPS; i += 1) {
  if (asArray.find((booking) => booking.reference === target)) {
    arrayHits += 1;
  }
}
const arrayMs = performance.now() - arrayStart;

console.log(`Prepared ${BOOKING_COUNT} bookings. Looked up reference ${target} ${LOOKUPS} times.`);
console.log(`Map.get:     ${mapMs.toFixed(2)} ms  (${mapHits} hits)  — O(1) average`);
console.log(`Array.find:  ${arrayMs.toFixed(2)} ms  (${arrayHits} hits)  — O(n) per lookup`);
console.log(
  `Map.get was ${(arrayMs / mapMs).toFixed(1)}× faster here because it jumps to the key instead of scanning the list.`,
);
