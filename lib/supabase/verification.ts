import { supabase } from './client';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface MyVerification {
  status: VerificationStatus;
  ghanaCardNumber: string;
  businessRegNumber: string | null;
  rejectionReason: string | null;
  submittedAt: string;
}

export const MAX_DOC_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const GHANA_CARD = /^GHA-[0-9]{9}-[0-9]$/;

export function normalizeGhanaCard(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function isValidGhanaCard(input: string): boolean {
  return GHANA_CARD.test(normalizeGhanaCard(input));
}

/** The signed-in supplier's own verification, or null if they haven't applied. */
export async function getMyVerification(userId: string): Promise<MyVerification | null> {
  const { data, error } = await supabase
    .from('supplier_verifications')
    .select('status, ghana_card_number, business_reg_number, rejection_reason, submitted_at')
    .eq('supplier_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as { status: VerificationStatus; ghana_card_number: string; business_reg_number: string | null; rejection_reason: string | null; submitted_at: string };
  return {
    status: r.status,
    ghanaCardNumber: r.ghana_card_number,
    businessRegNumber: r.business_reg_number,
    rejectionReason: r.rejection_reason,
    submittedAt: r.submitted_at,
  };
}

export function checkDocument(file: File): string | null {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) return 'Use a JPG, PNG, WebP or PDF file.';
  if (file.size > MAX_DOC_BYTES) return 'That file is over 5 MB. Please use a smaller photo or scan.';
  return null;
}

async function upload(userId: string, kind: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const path = `${userId}/${Date.now()}-${kind}.${ext}`;
  const { error } = await supabase.storage.from('supplier-documents').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Could not upload your ${kind} document. Please try again.`);
  return path;
}

/** Uploads the documents to the private bucket, then records the application for admin review. */
export async function submitVerification(input: {
  userId: string;
  ghanaCardNumber: string;
  businessRegNumber: string;
  front: File;
  back?: File | null;
  businessDoc?: File | null;
}): Promise<void> {
  const frontPath = await upload(input.userId, 'card-front', input.front);
  const backPath = input.back ? await upload(input.userId, 'card-back', input.back) : null;
  const docPath = input.businessDoc ? await upload(input.userId, 'business', input.businessDoc) : null;

  const { error } = await supabase.rpc('submit_supplier_verification', {
    p_ghana_card_number: normalizeGhanaCard(input.ghanaCardNumber),
    p_business_reg_number: input.businessRegNumber.trim() || null,
    p_front_path: frontPath,
    p_back_path: backPath,
    p_business_doc_path: docPath,
  });
  if (error) throw error;
}
