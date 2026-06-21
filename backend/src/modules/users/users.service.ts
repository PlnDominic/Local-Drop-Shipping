import { Injectable } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  getProfile(userId: string) {
    return this.repo.findById(userId);
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    const fields: Record<string, string> = {};
    if (dto.fullName) fields['full_name'] = dto.fullName;
    if (dto.phone) fields['phone'] = dto.phone;
    if (dto.avatarUrl) fields['avatar_url'] = dto.avatarUrl;
    return this.repo.update(userId, fields);
  }

  getUserById(id: string) {
    return this.repo.findById(id);
  }

  listUsers(page: number, limit: number) {
    return this.repo.findAll(page, limit);
  }
}
