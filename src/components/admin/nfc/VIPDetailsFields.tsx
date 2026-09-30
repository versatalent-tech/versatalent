"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGE_RANGES, INTERESTS, REFERRAL_SOURCES, type VIPProfileInput } from "@/lib/vip-profile";

export const EMPTY_VIP_PROFILE: VIPProfileInput = {
  phone: "",
  age_range: null,
  address_line1: "",
  address_line2: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
  interests: [],
  referral_source: null,
  consent_email: false,
  consent_sms: false,
  consent_post: false,
  notes: "",
};

// Radix Select can't use "" as a value
const NONE = "__none__";

interface VIPDetailsFieldsProps {
  value: VIPProfileInput;
  onChange: (value: VIPProfileInput) => void;
}

export function VIPDetailsFields({ value, onChange }: VIPDetailsFieldsProps) {
  const set = (patch: Partial<VIPProfileInput>) => onChange({ ...value, ...patch });

  const toggleInterest = (interest: string) => {
    const interests = value.interests || [];
    set({
      interests: interests.includes(interest)
        ? interests.filter((i) => i !== interest)
        : [...interests, interest],
    });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-semibold">VIP details</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Phone</label>
          <Input
            type="tel"
            value={value.phone || ""}
            onChange={(e) => set({ phone: e.target.value })}
            placeholder="07700 900000"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Age range</label>
          <Select
            value={value.age_range || NONE}
            onValueChange={(v) => set({ age_range: v === NONE ? null : (v as VIPProfileInput["age_range"]) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not given</SelectItem>
              {AGE_RANGES.map((range) => (
                <SelectItem key={range} value={range}>{range}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium block">Address</label>
        <Input
          value={value.address_line1 || ""}
          onChange={(e) => set({ address_line1: e.target.value })}
          placeholder="Address line 1"
        />
        <Input
          value={value.address_line2 || ""}
          onChange={(e) => set({ address_line2: e.target.value })}
          placeholder="Address line 2 (optional)"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={value.city || ""}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="City"
          />
          <Input
            value={value.postcode || ""}
            onChange={(e) => set({ postcode: e.target.value })}
            placeholder="Postcode"
          />
          <Input
            value={value.country || ""}
            onChange={(e) => set({ country: e.target.value })}
            placeholder="Country"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const selected = (value.interests || []).includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                aria-pressed={selected}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selected ? "bg-gold text-white border-gold" : "bg-white text-gray-700 border-gray-300 hover:border-gold"
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">How did they hear about us?</label>
        <Select
          value={value.referral_source || NONE}
          onValueChange={(v) => set({ referral_source: v === NONE ? null : v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not given</SelectItem>
            {REFERRAL_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>{source}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="rounded-md border border-gray-200 p-3">
        <legend className="text-sm font-medium px-1">Marketing consent</legend>
        <p className="text-xs text-gray-500 mb-2">
          Only tick a channel if the person has agreed to receive marketing that way.
        </p>
        <div className="flex flex-wrap gap-4">
          {([
            ["consent_email", "Email"],
            ["consent_sms", "SMS / text"],
            ["consent_post", "Post"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!value[key]}
                onChange={(e) => set({ [key]: e.target.checked })}
                className="h-4 w-4 accent-gold"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="text-sm font-medium mb-2 block">Notes</label>
        <textarea
          value={value.notes || ""}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-input px-3 py-2 text-sm"
          placeholder="Anything else useful (internal only)"
        />
      </div>
    </div>
  );
}
