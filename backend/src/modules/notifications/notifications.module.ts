import { Module } from '@nestjs/common';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { WhatsappChannel } from './channels/whatsapp.channel';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsChannel, EmailChannel, WhatsappChannel],
  exports: [NotificationsService],
})
export class NotificationsModule {}
