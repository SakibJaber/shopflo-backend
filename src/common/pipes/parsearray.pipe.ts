import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class OptionalParseArrayPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  }
}