import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { ForgotPasswordDto, RefreshTokenDto, ResetPasswordDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check duplicate email
    const { data: existing } = await this.supabase.db
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existing) throw new ConflictException('Email already registered.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const { data: user, error } = await this.supabase.db
      .from('users')
      .insert({
        full_name: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        password_hash: passwordHash,
        role: dto.role,
        is_verified: false,
      })
      .select('id, email, role')
      .single();

    if (error || !user) throw new BadRequestException(error?.message ?? 'Registration failed.');

    // Create role-specific profile row
    if (dto.role === 'dropshipper') {
      await this.supabase.db.from('dropshipper_profiles').insert({ user_id: user.id });
    } else if (dto.role === 'supplier') {
      await this.supabase.db.from('supplier_profiles').insert({ user_id: user.id });
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const { data: user, error } = await this.supabase.db
      .from('users')
      .select('id, email, role, password_hash, full_name, avatar_url, is_verified')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) throw new UnauthorizedException('Invalid email or password.');

    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    const tokens = await this.issueTokens(user.id as string, user.email as string, user.role as string);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
      },
    };
  }

  async logout(userId: string) {
    // Invalidate refresh token by clearing it from the DB
    await this.supabase.db
      .from('refresh_tokens')
      .delete()
      .eq('user_id', userId);

    return { message: 'Logged out successfully.' };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { data: record, error } = await this.supabase.db
      .from('refresh_tokens')
      .select('user_id, expires_at')
      .eq('token', dto.refreshToken)
      .maybeSingle();

    if (error || !record) throw new UnauthorizedException('Invalid refresh token.');

    if (new Date(record.expires_at as string) < new Date()) {
      await this.supabase.db.from('refresh_tokens').delete().eq('token', dto.refreshToken);
      throw new UnauthorizedException('Refresh token expired. Please log in again.');
    }

    const { data: user } = await this.supabase.db
      .from('users')
      .select('id, email, role')
      .eq('id', record.user_id)
      .single();

    if (!user) throw new UnauthorizedException('User not found.');

    // Rotate token
    await this.supabase.db.from('refresh_tokens').delete().eq('token', dto.refreshToken);
    return this.issueTokens(user.id as string, user.email as string, user.role as string);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { data: user } = await this.supabase.db
      .from('users')
      .select('id, email')
      .eq('email', dto.email)
      .maybeSingle();

    // Always return success to avoid email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.supabase.db.from('password_reset_tokens').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    // TODO: trigger email via NotificationsService
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { data: record } = await this.supabase.db
      .from('password_reset_tokens')
      .select('user_id, expires_at')
      .eq('token', dto.token)
      .maybeSingle();

    if (!record) throw new BadRequestException('Invalid or expired reset token.');
    if (new Date(record.expires_at as string) < new Date()) {
      throw new BadRequestException('Reset token has expired.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.supabase.db
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', record.user_id);

    await this.supabase.db
      .from('password_reset_tokens')
      .delete()
      .eq('token', dto.token);

    return { message: 'Password reset successfully.' };
  }

  // ── Token utilities ──────────────────────────────────────────────────────

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('app.jwtExpiresIn', '15m'),
    });

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.supabase.db.from('refresh_tokens').insert({
      user_id: userId,
      token: refreshToken,
      expires_at: expiresAt.toISOString(),
    });

    return { accessToken, refreshToken };
  }
}
