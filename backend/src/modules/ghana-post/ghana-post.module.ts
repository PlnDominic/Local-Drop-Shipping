import { Module } from '@nestjs/common';
import { GhanaPostController } from './ghana-post.controller';
import { GhanaPostService } from './ghana-post.service';

@Module({
  controllers: [GhanaPostController],
  providers: [GhanaPostService],
  exports: [GhanaPostService],
})
export class GhanaPostModule {}
