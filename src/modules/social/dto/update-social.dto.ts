import { PartialType } from '@nestjs/mapped-types';
import { CreateSocialMediaDto } from 'src/modules/social/dto/create-social.dto';


export class UpdateSocialMediaDto extends PartialType(CreateSocialMediaDto) {}