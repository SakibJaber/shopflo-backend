import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialMedia, SocialMediaSchema } from './schema/social-media.schema';
import { SocialMediaController } from 'src/modules/social/social.controller';
import { SocialMediaService } from 'src/modules/social/social.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SocialMedia.name, schema: SocialMediaSchema },
    ]),
  ],
  controllers: [SocialMediaController],
  providers: [SocialMediaService],
  exports: [SocialMediaService],
})
export class SocialMediaModule {}