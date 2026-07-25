export type IdentityType =
  | 'family'
  | 'vendor'
  | 'company'
  | 'bank_account'
  | 'upi_id'
  | 'email'
  | 'phone';

export type VerificationStatus = 'verified' | 'unverified';
export type Decision = 'TRUST' | 'VERIFY' | 'STOP';
export type ChallengeMethod = 'callback' | 'otp';
export type ChallengeResult = 'pending' | 'success' | 'failure' | 'cancelled';

export interface TrustedIdentity {
  id: string;
  user_id: string;
  display_name: string;
  identity_type: IdentityType;
  phone: string | null;
  email: string | null;
  upi_id: string | null;
  account_reference: string | null;
  verification_method: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  active: boolean;
  created_at: string;
}

export interface RiskSignal {
  key: string;
  label: string;
  score: number;
  detail: string;
}

export interface SafetyScan {
  id: string;
  user_id: string;
  receiver_reference: string | null;
  payment_amount: number | null;
  message_text: string | null;
  url: string | null;
  qr_payload: string | null;
  extracted_upi_id: string | null;
  receiver_known: string | null;
  details_changed: boolean;
  risk_signals: RiskSignal[];
  risk_score: number;
  original_decision: Decision;
  final_decision: Decision;
  created_at: string;
}

export interface VerificationChallenge {
  id: string;
  scan_id: string;
  user_id: string;
  trusted_identity_id: string | null;
  challenge_method: ChallengeMethod;
  challenge_code: string;
  result: ChallengeResult;
  created_at: string;
  completed_at: string | null;
}

export interface DecisionPassport {
  id: string;
  scan_id: string;
  user_id: string;
  passport_data: Record<string, unknown>;
  hash: string;
  digital_signature: string;
  integrity_status: 'valid' | 'tampered' | 'unknown';
  created_at: string;
}

export interface ParsedQr {
  upiId?: string;
  receiverName?: string;
  amount?: number;
  note?: string;
  raw: string;
}

export interface ScanInput {
  qrPayload: string;
  upiId: string;
  messageText: string;
  url: string;
  receiverKnown: 'known' | 'unknown' | '';
  paymentAmount: string;
  detailsChanged: boolean;
}
