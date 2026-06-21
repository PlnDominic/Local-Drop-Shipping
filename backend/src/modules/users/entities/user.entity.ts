export interface UserEntity {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  password_hash: string;
  role: 'customer' | 'dropshipper' | 'supplier' | 'admin';
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}
