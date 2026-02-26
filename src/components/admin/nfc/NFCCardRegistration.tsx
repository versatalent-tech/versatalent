"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Nfc, User, CreditCard, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { NFCReaderStatusIndicator } from "./NFCReaderStatus";

interface NFCUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

type CardType = 'artist' | 'vip' | 'staff' | 'guest';

const CARD_TYPE_CONFIG: Record<CardType, { label: string; description: string; color: string }> = {
  artist: {
    label: 'Artist',
    description: 'For performers and talent',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  vip: {
    label: 'VIP',
    description: 'For VIP members and premium guests',
    color: 'bg-gold/20 text-gold border-gold/30'
  },
  staff: {
    label: 'Staff',
    description: 'For event staff and employees',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  guest: {
    label: 'Guest',
    description: 'For general attendees',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
};

export function NFCCardRegistration() {
  const [users, setUsers] = useState<NFCUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedUID, setScannedUID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrationStep, setRegistrationStep] = useState<'scan' | 'configure' | 'complete'>('scan');

  const [formData, setFormData] = useState({
    card_uid: "",
    user_id: "",
    type: "vip" as CardType,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch('/api/nfc/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  function handleCardScanned(uid: string) {
    setScannedUID(uid);
    setFormData(prev => ({ ...prev, card_uid: uid }));
    setRegistrationStep('configure');
    setSuccess(`Card detected: ${uid}`);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleRegisterCard() {
    if (!formData.card_uid) {
      setError('Please scan a card first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        card_uid: formData.card_uid,
        user_id: formData.user_id || null,
        type: formData.type,
        status: 'active',
        is_active: true,
      };

      const response = await fetch('/api/nfc/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess('NFC card registered successfully!');
        setRegistrationStep('complete');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to register NFC card');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to register NFC card. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function resetRegistration() {
    setScannedUID(null);
    setFormData({
      card_uid: "",
      user_id: "",
      type: "vip",
    });
    setRegistrationStep('scan');
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gold/10 rounded-lg">
            <Nfc className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Quick Card Registration</h2>
            <p className="text-gray-600">Scan and register NFC cards in three easy steps</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mt-6">
          <div className={`flex items-center gap-2 ${registrationStep === 'scan' ? 'text-gold' : registrationStep !== 'scan' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              registrationStep === 'scan' ? 'bg-gold text-white' :
              registrationStep !== 'scan' ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              {registrationStep !== 'scan' ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <span className="font-medium">Scan Card</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-2 ${registrationStep === 'configure' ? 'text-gold' : registrationStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              registrationStep === 'configure' ? 'bg-gold text-white' :
              registrationStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              {registrationStep === 'complete' ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
            <span className="font-medium">Configure</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-2 ${registrationStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              registrationStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              {registrationStep === 'complete' ? <CheckCircle className="h-5 w-5" /> : '3'}
            </div>
            <span className="font-medium">Complete</span>
          </div>
        </div>
      </div>

      {/* NFC Reader Status */}
      <NFCReaderStatusIndicator
        onCardScanned={handleCardScanned}
        showControls={true}
      />

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-sm text-red-600 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Registration Form */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        {registrationStep === 'scan' && (
          <div className="text-center py-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Nfc className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Waiting for Card...</h3>
            <p className="text-gray-600 mb-6">
              Place an NFC card on the reader to begin registration
            </p>
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500">Or enter the card UID manually:</p>
              <div className="flex gap-2 max-w-md w-full">
                <Input
                  value={formData.card_uid}
                  onChange={(e) => setFormData({ ...formData, card_uid: e.target.value })}
                  placeholder="Enter card UID (e.g., 04A1B2C3D4E5F6)"
                  className="font-mono"
                />
                <Button
                  onClick={() => {
                    if (formData.card_uid) {
                      setScannedUID(formData.card_uid);
                      setRegistrationStep('configure');
                    }
                  }}
                  disabled={!formData.card_uid}
                  className="bg-gold hover:bg-gold/90 text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {registrationStep === 'configure' && (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Configure Card
            </h3>

            {/* Card UID Display */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-sm text-gray-600 block mb-1">Card UID</label>
              <code className="text-lg font-mono font-semibold">{scannedUID}</code>
            </div>

            {/* Card Type Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Card Type *</label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(CARD_TYPE_CONFIG) as CardType[]).map((type) => {
                  const config = CARD_TYPE_CONFIG[type];
                  const isSelected = formData.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-gold bg-gold/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Badge className={`${config.color} mb-2`}>
                        {config.label}
                      </Badge>
                      <p className="text-xs text-gray-600">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Assignment */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">
                <User className="h-4 w-4 inline mr-1" />
                Assign to User (Optional)
              </label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Leave Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <span className="text-gray-500 text-sm">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                You can assign the card to a user now or later
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetRegistration}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegisterCard}
                disabled={loading}
                className="flex-1 bg-gold hover:bg-gold/90 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Card'
                )}
              </Button>
            </div>
          </div>
        )}

        {registrationStep === 'complete' && (
          <div className="text-center py-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-green-800">Card Registered Successfully!</h3>
            <p className="text-gray-600 mb-2">
              Card <code className="font-mono bg-gray-100 px-2 py-1 rounded">{scannedUID}</code> has been registered.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Type: <Badge className={CARD_TYPE_CONFIG[formData.type].color}>{CARD_TYPE_CONFIG[formData.type].label}</Badge>
              {formData.user_id && (
                <span className="ml-2">
                  • Assigned to user
                </span>
              )}
            </p>
            <Button
              onClick={resetRegistration}
              className="bg-gold hover:bg-gold/90 text-white"
            >
              <Nfc className="h-4 w-4 mr-2" />
              Register Another Card
            </Button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Quick Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Make sure the NFC reader is connected before scanning</li>
          <li>• Place the card flat on the reader for best results</li>
          <li>• Cards can be assigned to users later from the Cards tab</li>
          <li>• Use the "Test Scan" button to simulate a card for testing</li>
        </ul>
      </div>
    </div>
  );
}
