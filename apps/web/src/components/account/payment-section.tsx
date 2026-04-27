"use client";

import { useState } from "react";
import type { CheckoutProfile, PaymentCard, SavedAddress } from "@cart/shared";
import { updateCheckoutProfileAction } from "@/app/account/actions";

const CARD_ICONS: Record<string, string> = {
  Visa: "credit_card",
  Mastercard: "credit_card",
  Amex: "credit_card",
  Discover: "credit_card",
};

const BLANK_CARD_DRAFT = {
  cardType: "Visa" as PaymentCard["cardType"],
  cardNumber: "",
  expiry: "",
  name: "",
};

const BLANK_ADDRESS_DRAFT = {
  label: "",
  street: "",
  city: "",
  state: "",
  zip: "",
};

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function CheckoutProfileSettings({
  initialProfile,
}: {
  initialProfile: CheckoutProfile;
}) {
  const [addresses, setAddresses] = useState<SavedAddress[]>(
    initialProfile.saved_addresses,
  );
  const [cards, setCards] = useState<PaymentCard[]>(
    initialProfile.payment_cards,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>(
    {},
  );

  async function persist(nextAddresses: SavedAddress[], nextCards: PaymentCard[]) {
    setIsSaving(true);
    setFeedback({});
    const result = await updateCheckoutProfileAction({
      saved_addresses: nextAddresses,
      payment_cards: nextCards,
    });
    setIsSaving(false);

    if (result.error) {
      setFeedback({ error: result.error });
      return false;
    }

    setAddresses(nextAddresses);
    setCards(nextCards);
    setFeedback({ success: result.success });
    return true;
  }

  return (
    <div className="space-y-10">
      {feedback.error ? (
        <div className="rounded-xl bg-error-container p-3 text-body-sm text-on-error-container">
          {feedback.error}
        </div>
      ) : null}
      {feedback.success ? (
        <div className="rounded-xl bg-secondary-container p-3 text-body-sm text-on-secondary-container">
          {feedback.success}
        </div>
      ) : null}

      <AddressSection
        addresses={addresses}
        cards={cards}
        isSaving={isSaving}
        onPersist={persist}
      />
      <hr className="border-outline-variant/30" />
      <PaymentSection
        addresses={addresses}
        cards={cards}
        isSaving={isSaving}
        onPersist={persist}
      />
    </div>
  );
}

function PaymentSection({
  addresses,
  cards,
  isSaving,
  onPersist,
}: {
  addresses: SavedAddress[];
  cards: PaymentCard[];
  isSaving: boolean;
  onPersist: (addresses: SavedAddress[], cards: PaymentCard[]) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(BLANK_CARD_DRAFT);
  const [errors, setErrors] = useState<Partial<typeof BLANK_CARD_DRAFT>>({});

  function validate(requireCardNumber = true) {
    const nextErrors: Partial<typeof BLANK_CARD_DRAFT> = {};
    const digits = draft.cardNumber.replace(/\D/g, "");
    if (requireCardNumber && (digits.length < 13 || digits.length > 19)) {
      nextErrors.cardNumber = "Enter a valid card number (13-19 digits)";
    }
    if (!/^\d{2}\/\d{2}$/.test(draft.expiry)) {
      nextErrors.expiry = "Use MM/YY format";
    }
    if (!draft.name.trim()) {
      nextErrors.name = "Required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleAdd() {
    if (!validate(true)) return;

    const digits = draft.cardNumber.replace(/\D/g, "");
    const nextCards = [
      ...cards,
      {
        id: crypto.randomUUID(),
        cardType: draft.cardType,
        lastFour: digits.slice(-4),
        expiry: draft.expiry,
        name: draft.name.trim(),
        isDefault: cards.length === 0,
      },
    ];

    if (await onPersist(addresses, nextCards)) {
      setDraft(BLANK_CARD_DRAFT);
      setErrors({});
      setShowAdd(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const hasNewNumber = draft.cardNumber.replace(/\D/g, "").length > 0;
    if (!validate(hasNewNumber)) return;

    const existing = cards.find((card) => card.id === id);
    if (!existing) return;
    const digits = draft.cardNumber.replace(/\D/g, "");
    const nextCards = cards.map((card) =>
      card.id === id
        ? {
            ...card,
            cardType: draft.cardType,
            lastFour: digits.length >= 4 ? digits.slice(-4) : existing.lastFour,
            expiry: draft.expiry,
            name: draft.name.trim(),
          }
        : card,
    );

    if (await onPersist(addresses, nextCards)) {
      setEditingId(null);
      setErrors({});
    }
  }

  async function handleDelete(id: string) {
    const nextCards = cards.filter((card) => card.id !== id);
    if (nextCards.length > 0 && !nextCards.some((card) => card.isDefault)) {
      nextCards[0] = { ...nextCards[0], isDefault: true };
    }
    await onPersist(addresses, nextCards);
  }

  async function handleSetDefault(id: string) {
    await onPersist(
      addresses,
      cards.map((card) => ({ ...card, isDefault: card.id === id })),
    );
  }

  function openEdit(card: PaymentCard) {
    setDraft({
      cardType: card.cardType,
      cardNumber: "",
      expiry: card.expiry,
      name: card.name,
    });
    setErrors({});
    setEditingId(card.id);
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-headline-sm font-bold text-on-surface">Payment Methods</h2>
        <p className="mt-1 text-body-sm text-outline">
          Manage the cards used at checkout. Your default card is selected automatically.
        </p>
      </div>

      <div className="space-y-3">
        {cards.length === 0 && !showAdd ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low p-8 text-center">
            <span className="material-symbols-outlined text-[40px] text-outline-variant">credit_card_off</span>
            <p className="mt-2 text-body-md font-semibold text-on-surface">No payment methods saved</p>
            <p className="mt-1 text-body-sm text-outline">Add a card to use at checkout.</p>
          </div>
        ) : null}

        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-2xl border border-outline-variant/30 bg-white p-4"
          >
            {editingId === card.id ? (
              <CardForm
                draft={draft}
                errors={errors}
                disabled={isSaving}
                onChange={(field, value) =>
                  setDraft((previous) => ({ ...previous, [field]: value }))
                }
                onSave={() => void handleSaveEdit(card.id)}
                onCancel={() => {
                  setEditingId(null);
                  setErrors({});
                }}
                submitLabel="Save Changes"
                existingLastFour={card.lastFour}
              />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container">
                  <span className="material-symbols-outlined text-on-surface-variant">
                    {CARD_ICONS[card.cardType]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body-md font-semibold text-on-surface">
                      {card.cardType} .... {card.lastFour}
                    </p>
                    {card.isDefault ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="text-body-sm text-outline mt-0.5">
                    {card.name} - Exp {card.expiry}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!card.isDefault ? (
                    <button
                      onClick={() => void handleSetDefault(card.id)}
                      disabled={isSaving}
                      className="text-label-sm text-outline hover:text-primary transition-colors disabled:opacity-50"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button
                    onClick={() => openEdit(card)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container transition-colors text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => void handleDelete(card.id)}
                    disabled={isSaving}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-error-container/30 transition-colors text-outline hover:text-error disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="rounded-2xl border border-outline-variant/30 bg-white p-5">
          <p className="text-label-lg font-bold text-on-surface mb-4">New Card</p>
          <CardForm
            draft={draft}
            errors={errors}
            disabled={isSaving}
            onChange={(field, value) =>
              setDraft((previous) => ({ ...previous, [field]: value }))
            }
            onSave={() => void handleAdd()}
            onCancel={() => {
              setShowAdd(false);
              setErrors({});
            }}
            submitLabel="Add Card"
          />
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft(BLANK_CARD_DRAFT);
            setErrors({});
            setEditingId(null);
            setShowAdd(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant/50 py-3 text-label-md font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add new card
        </button>
      )}
    </div>
  );
}

function CardForm({
  draft,
  errors,
  disabled,
  onChange,
  onSave,
  onCancel,
  submitLabel,
  existingLastFour,
}: {
  draft: typeof BLANK_CARD_DRAFT;
  errors: Partial<typeof BLANK_CARD_DRAFT>;
  disabled: boolean;
  onChange: (field: keyof typeof BLANK_CARD_DRAFT, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  submitLabel: string;
  existingLastFour?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-label-sm uppercase tracking-wide text-outline">Card Type</label>
        <select
          value={draft.cardType}
          disabled={disabled}
          onChange={(event) => onChange("cardType", event.target.value)}
          className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {(["Visa", "Mastercard", "Amex", "Discover"] as const).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-label-sm uppercase tracking-wide text-outline">Card Number</label>
        <input
          value={draft.cardNumber}
          disabled={disabled}
          onChange={(event) =>
            onChange("cardNumber", formatCardNumber(event.target.value))
          }
          placeholder={existingLastFour ? `.... .... .... ${existingLastFour}` : "1234 5678 9012 3456"}
          inputMode="numeric"
          className={`w-full rounded-xl border px-3 py-2 text-body-sm text-on-surface placeholder:text-outline bg-surface-container-low tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.cardNumber ? "border-error" : "border-outline-variant/50"}`}
        />
        {existingLastFour && !draft.cardNumber ? (
          <p className="text-[11px] text-outline">
            Leave blank to keep existing card ending in {existingLastFour}
          </p>
        ) : null}
        {errors.cardNumber ? (
          <p className="text-[11px] text-error">{errors.cardNumber}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-label-sm uppercase tracking-wide text-outline">Expiry (MM/YY)</label>
          <input
            value={draft.expiry}
            disabled={disabled}
            onChange={(event) => {
              let value = event.target.value.replace(/[^\d/]/g, "");
              if (value.length === 2 && !value.includes("/")) value = `${value}/`;
              onChange("expiry", value.slice(0, 5));
            }}
            placeholder="12/26"
            className={`w-full rounded-xl border px-3 py-2 text-body-sm text-on-surface placeholder:text-outline bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.expiry ? "border-error" : "border-outline-variant/50"}`}
          />
          {errors.expiry ? <p className="text-[11px] text-error">{errors.expiry}</p> : null}
        </div>
        <div className="space-y-1">
          <label className="text-label-sm uppercase tracking-wide text-outline">Cardholder Name</label>
          <input
            value={draft.name}
            disabled={disabled}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Jane Smith"
            className={`w-full rounded-xl border px-3 py-2 text-body-sm text-on-surface placeholder:text-outline bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? "border-error" : "border-outline-variant/50"}`}
          />
          {errors.name ? <p className="text-[11px] text-error">{errors.name}</p> : null}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 rounded-xl border border-outline-variant py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={disabled}
          className="flex-1 rounded-xl bg-primary py-2 text-label-md font-semibold text-on-primary hover:bg-on-primary-container transition-colors disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function AddressSection({
  addresses,
  cards,
  isSaving,
  onPersist,
}: {
  addresses: SavedAddress[];
  cards: PaymentCard[];
  isSaving: boolean;
  onPersist: (addresses: SavedAddress[], cards: PaymentCard[]) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(BLANK_ADDRESS_DRAFT);
  const [errors, setErrors] = useState<Partial<typeof BLANK_ADDRESS_DRAFT>>({});

  function validate() {
    const nextErrors: Partial<typeof BLANK_ADDRESS_DRAFT> = {};
    if (!draft.street.trim()) nextErrors.street = "Required";
    if (!draft.city.trim()) nextErrors.city = "Required";
    if (!draft.zip.trim()) nextErrors.zip = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleAdd() {
    if (!validate()) return;

    const nextAddresses = [
      ...addresses,
      {
        id: crypto.randomUUID(),
        label: draft.label.trim() || `${draft.street.trim()}, ${draft.city.trim()}`,
        street: draft.street.trim(),
        city: draft.city.trim(),
        state: draft.state.trim().toUpperCase().slice(0, 2),
        zip: draft.zip.trim(),
        isDefault: addresses.length === 0,
      },
    ];

    if (await onPersist(nextAddresses, cards)) {
      setDraft(BLANK_ADDRESS_DRAFT);
      setErrors({});
      setShowAdd(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!validate()) return;

    const nextAddresses = addresses.map((address) =>
      address.id === id
        ? {
            ...address,
            label: draft.label.trim() || `${draft.street.trim()}, ${draft.city.trim()}`,
            street: draft.street.trim(),
            city: draft.city.trim(),
            state: draft.state.trim().toUpperCase().slice(0, 2),
            zip: draft.zip.trim(),
          }
        : address,
    );

    if (await onPersist(nextAddresses, cards)) {
      setEditingId(null);
      setErrors({});
    }
  }

  async function handleDelete(id: string) {
    const nextAddresses = addresses.filter((address) => address.id !== id);
    if (nextAddresses.length > 0 && !nextAddresses.some((address) => address.isDefault)) {
      nextAddresses[0] = { ...nextAddresses[0], isDefault: true };
    }
    await onPersist(nextAddresses, cards);
  }

  async function handleSetDefault(id: string) {
    await onPersist(
      addresses.map((address) => ({ ...address, isDefault: address.id === id })),
      cards,
    );
  }

  function openEdit(address: SavedAddress) {
    setDraft({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
    });
    setErrors({});
    setEditingId(address.id);
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-headline-sm font-bold text-on-surface">Saved Addresses</h2>
        <p className="mt-1 text-body-sm text-outline">
          Manage delivery addresses used at checkout.
        </p>
      </div>

      <div className="space-y-3">
        {addresses.length === 0 && !showAdd ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low p-8 text-center">
            <span className="material-symbols-outlined text-[40px] text-outline-variant">location_off</span>
            <p className="mt-2 text-body-md font-semibold text-on-surface">No addresses saved</p>
            <p className="mt-1 text-body-sm text-outline">Add an address to use at checkout.</p>
          </div>
        ) : null}

        {addresses.map((address) => (
          <div key={address.id} className="rounded-2xl border border-outline-variant/30 bg-white p-4">
            {editingId === address.id ? (
              <AddressForm
                draft={draft}
                errors={errors}
                disabled={isSaving}
                onChange={(field, value) =>
                  setDraft((previous) => ({ ...previous, [field]: value }))
                }
                onSave={() => void handleSaveEdit(address.id)}
                onCancel={() => {
                  setEditingId(null);
                  setErrors({});
                }}
                submitLabel="Save Changes"
              />
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container mt-0.5">
                  <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body-md font-semibold text-on-surface">{address.label}</p>
                    {address.isDefault ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Default</span>
                    ) : null}
                  </div>
                  <p className="text-body-sm text-outline mt-0.5">
                    {address.street}, {address.city}
                    {address.state ? `, ${address.state}` : ""} {address.zip}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!address.isDefault ? (
                    <button
                      onClick={() => void handleSetDefault(address.id)}
                      disabled={isSaving}
                      className="text-label-sm text-outline hover:text-primary transition-colors disabled:opacity-50"
                    >
                      Set default
                    </button>
                  ) : null}
                  <button onClick={() => openEdit(address)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container transition-colors text-outline hover:text-on-surface">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => void handleDelete(address.id)}
                    disabled={isSaving}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-error-container/30 transition-colors text-outline hover:text-error disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="rounded-2xl border border-outline-variant/30 bg-white p-5">
          <p className="text-label-lg font-bold text-on-surface mb-4">New Address</p>
          <AddressForm
            draft={draft}
            errors={errors}
            disabled={isSaving}
            onChange={(field, value) =>
              setDraft((previous) => ({ ...previous, [field]: value }))
            }
            onSave={() => void handleAdd()}
            onCancel={() => {
              setShowAdd(false);
              setErrors({});
            }}
            submitLabel="Add Address"
          />
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft(BLANK_ADDRESS_DRAFT);
            setErrors({});
            setEditingId(null);
            setShowAdd(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant/50 py-3 text-label-md font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add new address
        </button>
      )}
    </div>
  );
}

function AddressForm({
  draft,
  errors,
  disabled,
  onChange,
  onSave,
  onCancel,
  submitLabel,
}: {
  draft: typeof BLANK_ADDRESS_DRAFT;
  errors: Partial<typeof BLANK_ADDRESS_DRAFT>;
  disabled: boolean;
  onChange: (field: keyof typeof BLANK_ADDRESS_DRAFT, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-label-sm uppercase tracking-wide text-outline">Label <span className="normal-case text-outline/70">(optional)</span></label>
        <input
          value={draft.label}
          disabled={disabled}
          onChange={(event) => onChange("label", event.target.value)}
          placeholder="e.g. Home, Office"
          className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div className="space-y-1">
        <label className="text-label-sm uppercase tracking-wide text-outline">Street Address</label>
        <input
          value={draft.street}
          disabled={disabled}
          onChange={(event) => onChange("street", event.target.value)}
          placeholder="123 Main St"
          className={`w-full rounded-xl border px-3 py-2 text-body-sm text-on-surface placeholder:text-outline bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.street ? "border-error" : "border-outline-variant/50"}`}
        />
        {errors.street ? <p className="text-[11px] text-error">{errors.street}</p> : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 space-y-1">
          <label className="text-label-sm uppercase tracking-wide text-outline">City</label>
          <input
            value={draft.city}
            disabled={disabled}
            onChange={(event) => onChange("city", event.target.value)}
            placeholder="Chicago"
            className={`w-full rounded-xl border px-3 py-2 text-body-sm text-on-surface placeholder:text-outline bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.city ? "border-error" : "border-outline-variant/50"}`}
          />
          {errors.city ? <p className="text-[11px] text-error">{errors.city}</p> : null}
        </div>
        <div className="space-y-1">
          <label className="text-label-sm uppercase tracking-wide text-outline">State</label>
          <input
            value={draft.state}
            disabled={disabled}
            onChange={(event) =>
              onChange("state", event.target.value.toUpperCase().slice(0, 2))
            }
            placeholder="IL"
            className="w-full rounded-xl border border-outline-variant/50 px-3 py-2 text-body-sm text-on-surface placeholder:text-outline bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label-sm uppercase tracking-wide text-outline">ZIP</label>
          <input
            value={draft.zip}
            disabled={disabled}
            onChange={(event) =>
              onChange("zip", event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="60601"
            className={`w-full rounded-xl border px-3 py-2 text-body-sm text-on-surface placeholder:text-outline bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.zip ? "border-error" : "border-outline-variant/50"}`}
          />
          {errors.zip ? <p className="text-[11px] text-error">{errors.zip}</p> : null}
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 rounded-xl border border-outline-variant py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={disabled}
          className="flex-1 rounded-xl bg-primary py-2 text-label-md font-semibold text-on-primary hover:bg-on-primary-container transition-colors disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
