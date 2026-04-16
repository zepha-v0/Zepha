import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StoredOffer, StoredOfferStatus } from '../types';

const OFFERS_STORAGE_KEY = '@zepha/offers';
const DEFAULT_OFFER_PRIORITY = 50;
const DEFAULT_OFFER_URGENCY = 'normal';

function sortOffers(offers: StoredOffer[]) {
  return [...offers].sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeOffer(offer: Partial<StoredOffer>) {
  if (
    typeof offer.id !== 'string' ||
    typeof offer.type !== 'string' ||
    typeof offer.title !== 'string' ||
    typeof offer.body !== 'string' ||
    typeof offer.createdAt !== 'number' ||
    typeof offer.status !== 'string'
  ) {
    return null;
  }

  return {
    id: offer.id,
    type: offer.type,
    title: offer.title,
    body: offer.body,
    priority:
      typeof offer.priority === 'number' && Number.isFinite(offer.priority)
        ? offer.priority
        : DEFAULT_OFFER_PRIORITY,
    urgency: offer.urgency === 'urgent' ? 'urgent' : DEFAULT_OFFER_URGENCY,
    createdAt: offer.createdAt,
    status: offer.status,
    respondedAt: typeof offer.respondedAt === 'number' ? offer.respondedAt : null,
  } satisfies StoredOffer;
}

export async function loadStoredOffers() {
  const raw = await AsyncStorage.getItem(OFFERS_STORAGE_KEY);
  if (!raw) return [] as StoredOffer[];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as StoredOffer[];

    return sortOffers(
      parsed
        .map((offer) => normalizeOffer(offer))
        .filter((offer): offer is StoredOffer => offer !== null)
    );
  } catch {
    return [] as StoredOffer[];
  }
}

export async function saveStoredOffers(offers: StoredOffer[]) {
  const next = sortOffers(offers);
  await AsyncStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function createStoredOffer(input: {
  type: StoredOffer['type'];
  title: string;
  body: string;
  priority?: number;
  urgency?: StoredOffer['urgency'];
}) {
  const offers = await loadStoredOffers();
  const createdAt = Date.now();
  const offer: StoredOffer = {
    id: `offer-${createdAt}`,
    type: input.type,
    title: input.title,
    body: input.body,
    priority: input.priority ?? DEFAULT_OFFER_PRIORITY,
    urgency: input.urgency ?? DEFAULT_OFFER_URGENCY,
    createdAt,
    status: 'pending',
    respondedAt: null,
  };

  return saveStoredOffers([offer, ...offers]);
}

export async function updateStoredOfferStatus(id: string, status: StoredOfferStatus) {
  const offers = await loadStoredOffers();
  const next = offers.map((offer) =>
    offer.id === id
      ? {
          ...offer,
          status,
          respondedAt: Date.now(),
        }
      : offer
  );

  return saveStoredOffers(next);
}

export async function clearStoredOffers() {
  await AsyncStorage.removeItem(OFFERS_STORAGE_KEY);
  return [] as StoredOffer[];
}
