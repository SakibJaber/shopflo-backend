import { PartialType } from '@nestjs/mapped-types';
import { CreateStaticPageDto } from './create-static-page.dto';

export class UpdateStaticPageDto extends PartialType(CreateStaticPageDto) {}
