import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class OrderIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (
      !/^\d+$/.test(value) ||
      !Number.isInteger(id) ||
      id < 1 ||
      id > 2_147_483_647
    ) {
      throw new BadRequestException(
        'Order id must be a positive 32-bit integer',
      );
    }
    return id;
  }
}
