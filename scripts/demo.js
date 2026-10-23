import {
  DomainError,
  ErrorCode,
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  findBookingByReference,
  joinWaitlist,
  peekWaitlist,
} from "../src/domain/inventory.js";

const store = createStore();

const event = createEvent(store, { name: "Jazz Night" });
const general = addTier(store, {
  eventId: event.id,
  name: "General Admission",
  capacity: 2,
  priceCents: 2500,
});

console.log("Event Ticketing — terminal demo");
console.log(`Created "${event.name}" with ${general.name}: ${general.capacity} seats at ${general.priceCents} cents.`);
console.log("");

const alice = bookTickets(store, {
  eventId: event.id,
  tierId: general.id,
  holderName: "Alice Chen",
  quantity: 2,
});

console.log(`Alice books 2 tickets. Reference ${alice.reference}. Status: ${alice.status}.`);
console.log(`Seats left: ${findAvailable()}. Event is sold out.`);
console.log("");

try {
  bookTickets(store, {
    eventId: event.id,
    tierId: general.id,
    holderName: "Bob Mensah",
    quantity: 1,
  });
  console.log("ERROR: Bob's booking should have been refused.");
} catch (error) {
  if (error instanceof DomainError && error.code === ErrorCode.SOLD_OUT) {
    console.log(`Bob tries to book 1 ticket and is refused (${error.code}): ${error.message}.`);
    console.log(`Seats left after the refused booking: ${findAvailable()} (nothing changed).`);
  } else {
    throw error;
  }
}
console.log("");

const carol = joinWaitlist(store, { eventId: event.id, name: "Carol Okonkwo" });
const dave = joinWaitlist(store, { eventId: event.id, name: "Dave Patel" });
console.log(`${carol.name} joins the waitlist.`);
console.log(`${dave.name} joins the waitlist behind ${carol.name}.`);
console.log("");

const cancelled = cancelBooking(store, alice.id);
const lookedUp = findBookingByReference(store, alice.reference);
console.log(`Alice cancels booking ${cancelled.reference}. Status: ${lookedUp.status}.`);
console.log(`Seats released. Seats left: ${findAvailable()}.`);
console.log("");

const nextInLine = peekWaitlist(store, event.id);
console.log(`Next person in line: ${nextInLine.name}.`);

function findAvailable() {
  return store.tiers.get(general.id).available;
}
