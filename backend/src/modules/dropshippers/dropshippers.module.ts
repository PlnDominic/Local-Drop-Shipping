import { Module } from '@nestjs/common';
import { DroppshippersController } from './dropshippers.controller';
import { DroppshippersService } from './dropshippers.service';

@Module({
  controllers: [DroppshippersController],
  providers: [DroppshippersService],
  exports: [DroppshippersService],
})
export class DroppshippersModule {}
