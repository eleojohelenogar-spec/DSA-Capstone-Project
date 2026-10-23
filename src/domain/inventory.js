import { DomainError, ErrorCode, fail } from "./errors.js";
import { newId, newReference } from "./ids.js";
import { Queue } from "./waitlistQueue.js";

const MIN_TICKETS = 1;
const MAX_TICKETS = 10;

export function createStore() {
  return {
    events: new Map(),
    tiers: new Map(),
    bookings: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map(),
  };
}

export function createEvent(store, input) {
  assertStore(store);
  const name = requiredString(input?.name, "name");

  const event = {
    id: newId(),
    name,
    createdAt: nowIso(),
  };

  store.events.set(event.id, event);
  store.waitlists.set(event.id, new Queue());
  return Object.freeze({ ...event });
}

export function addTier(store, input) {
  assertStore(store);
  const eventId = requiredString(input?.eventId, "eventId");
  requireEvent(store, eventId);

  const name = requiredString(input?.name, "name");
  const capacity = requiredPositiveInt(input?.capacity, "capacity");
  const priceCents = requiredNonNegativeInt(input?.priceCents, "priceCents");

  const tier = {
    id: newId(),
    eventId,
    name,
    capacity,
    available: capacity,
    priceCents,
  };

  store.tiers.set(tier.id, tier);
  return snapshotTier(tier);
}

export function bookTickets(store, input) {
  assertStore(store);
  const eventId = requiredString(input?.eventId, "eventId");
  const tierId = requiredString(input?.tierId, "tierId");
  const holderName = requiredString(input?.holderName, "holderName");
  const quantity = requiredIntInRange(input?.quantity, "quantity", MIN_TICKETS, MAX_TICKETS);

  requireEvent(store, eventId);
  const tier = requireTier(store, tierId);
  if (tier.eventId !== eventId) {
    fail(ErrorCode.VALIDATION, "tier does not belong to this event");
  }

  if (tier.available < quantity) {
    fail(ErrorCode.SOLD_OUT, `only ${tier.available} seat(s) left in ${tier.name}`);
  }

  const booking = {
    id: newId(),
    reference: uniqueReference(store),
    eventId,
    tierId,
    holderName,
    quantity,
    unitPriceCents: tier.priceCents,
    totalCents: tier.priceCents * quantity,
    status: "confirmed",
    createdAt: nowIso(),
    cancelledAt: null,
  };

  tier.available -= quantity;
  store.bookings.set(booking.id, booking);
  store.bookingsByReference.set(booking.reference, booking);
  return snapshotBooking(booking);
}

export function cancelBooking(store, bookingId) {
  assertStore(store);
  const id = requiredString(bookingId, "bookingId");
  const booking = store.bookings.get(id);
  if (!booking) {
    fail(ErrorCode.NOT_FOUND, `booking not found: ${id}`);
  }
  if (booking.status === "cancelled") {
    fail(ErrorCode.ALREADY_CANCELLED, `booking ${booking.reference} is already cancelled`);
  }

  const tier = requireTier(store, booking.tierId);
  tier.available += booking.quantity;
  booking.status = "cancelled";
  booking.cancelledAt = nowIso();
  return snapshotBooking(booking);
}

export function findBookingByReference(store, reference) {
  assertStore(store);
  const ref = requiredString(reference, "reference");
  const booking = store.bookingsByReference.get(ref);
  if (!booking) {
    fail(ErrorCode.NOT_FOUND, `no booking with reference ${ref}`);
  }
  return snapshotBooking(booking);
}

export function joinWaitlist(store, input) {
  assertStore(store);
  const eventId = requiredString(input?.eventId, "eventId");
  requireEvent(store, eventId);
  const name = requiredString(input?.name, "name");

  const queue = store.waitlists.get(eventId);
  const entry = Object.freeze({
    id: newId(),
    eventId,
    name,
    joinedAt: nowIso(),
  });
  queue.enqueue(entry);
  return entry;
}

export function peekWaitlist(store, eventId) {
  assertStore(store);
  const id = requiredString(eventId, "eventId");
  requireEvent(store, id);
  return store.waitlists.get(id).peek();
}

function uniqueReference(store) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const reference = newReference();
    if (!store.bookingsByReference.has(reference)) {
      return reference;
    }
  }
  fail(ErrorCode.VALIDATION, "could not allocate a unique booking reference");
}

function snapshotTier(tier) {
  return Object.freeze({
    id: tier.id,
    eventId: tier.eventId,
    name: tier.name,
    capacity: tier.capacity,
    available: tier.available,
    priceCents: tier.priceCents,
  });
}

function snapshotBooking(booking) {
  return Object.freeze({ ...booking });
}

function requireEvent(store, eventId) {
  const event = store.events.get(eventId);
  if (!event) {
    fail(ErrorCode.NOT_FOUND, `event not found: ${eventId}`);
  }
  return event;
}

function requireTier(store, tierId) {
  const tier = store.tiers.get(tierId);
  if (!tier) {
    fail(ErrorCode.NOT_FOUND, `tier not found: ${tierId}`);
  }
  return tier;
}

function assertStore(store) {
  if (
    !store ||
    !(store.events instanceof Map) ||
    !(store.tiers instanceof Map) ||
    !(store.bookings instanceof Map) ||
    !(store.bookingsByReference instanceof Map) ||
    !(store.waitlists instanceof Map)
  ) {
    fail(ErrorCode.VALIDATION, "store is required");
  }
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(ErrorCode.VALIDATION, `${field} must be a non-empty string`);
  }
  return value.trim();
}

function requiredNonNegativeInt(value, field) {
  assertWholeNumber(value, field);
  if (value < 0) {
    fail(ErrorCode.VALIDATION, `${field} must be zero or a positive whole number of cents`);
  }
  return value;
}

function requiredPositiveInt(value, field) {
  assertWholeNumber(value, field);
  if (value < 1) {
    fail(ErrorCode.VALIDATION, `${field} must be a positive whole number`);
  }
  return value;
}

function requiredIntInRange(value, field, min, max) {
  assertWholeNumber(value, field);
  if (value < min || value > max) {
    fail(ErrorCode.VALIDATION, `${field} must be between ${min} and ${max}`);
  }
  return value;
}

function assertWholeNumber(value, field) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(ErrorCode.VALIDATION, `${field} must be a whole number (no decimals)`);
  }
}

function nowIso() {
  return new Date().toISOString();
}

export { DomainError, ErrorCode };
